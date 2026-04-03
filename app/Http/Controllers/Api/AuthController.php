<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => Role::where('slug', 'user')->first()->id ?? null,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        event(new Registered($user));

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
        ]);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (! Auth::attempt($validated)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::user()->load('role.permissions');

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function createManager(Request $request)
    {
        $user = $request->user();

        if (! $user->hasPermission('create_manager')) {
            abort(403, 'You do not have permission to create managers.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role_id' => 'required|exists:roles,id',
            'organization_id' => 'nullable|exists:organizations,id',
            'permission_slugs' => 'nullable|array',
            'permission_slugs.*' => 'exists:permissions,slug',
        ]);

        // Prevent assigning higher permissions than self (simple check)
        $requestedPerms = Permission::whereIn('slug', $validated['permission_slugs'] ?? [])->get();
        foreach ($requestedPerms as $perm) {
            if (! $user->hasPermission($perm->slug)) {
                abort(403, "Cannot assign permission '{$perm->slug}' you don't have.");
            }
        }

        $manager = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'organization_id' => $validated['organization_id'],
            'created_by' => $user->id,
        ]);

        // Assign extra permissions if provided
        if (!empty($validated['permission_slugs'])) {
            $manager->permissions()->attach(
                Permission::whereIn('slug', $validated['permission_slugs'])->pluck('id')
            );
        }

        $manager->load('role.permissions');

        $token = $manager->createToken('auth-token')->plainTextToken;

        return response()->json([
            'manager' => $manager,
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'Reset link sent to email']);
        }

        return response()->json(['error' => 'Unable to send reset link'], 400);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'token', 'password', 'password_confirmation'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully']);
        }

        return response()->json(['error' => 'Unable to reset password'], 400);
    }
}
