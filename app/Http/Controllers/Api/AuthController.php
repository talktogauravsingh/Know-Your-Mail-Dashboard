<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Repositories\AuthRepository;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected $authRepo;

    public function __construct(AuthRepository $authRepo)
    {
        $this->authRepo = $authRepo;
    }

    /**
     * Register User
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = $this->authRepo->createUser($validated);

        $token = $user->createToken('auth-token')->plainTextToken;

        event(new Registered($user));

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
        ]);
    }

    /**
     * Login
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = $this->authRepo->login($validated);

        if (!$user) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $this->authRepo->logout($request->user());

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Create Manager
     */
    public function createManager(Request $request)
    {
        $user = $request->user();

        if (!$user->hasPermission('create_manager')) {
            return response()->json([
                'error' => 'You do not have permission to create managers.'
            ], 403);
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

        try {
            $manager = $this->authRepo->createManager($validated, $user);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 403);
        }

        $token = $manager->createToken('auth-token')->plainTextToken;

        return response()->json([
            'manager' => $manager->load('role.permissions'),
            'token' => $token,
        ]);
    }

    /**
     * Forgot Password
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Reset link sent to email'
            ]);
        }

        return response()->json([
            'error' => 'Unable to send reset link'
        ], 400);
    }

    /**
     * Reset Password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'token', 'password', 'password_confirmation'),
            function ($user, $password) {
                $this->authRepo->resetUserPassword($user, $password);
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password reset successfully'
            ]);
        }

        return response()->json([
            'error' => 'Unable to reset password'
        ], 400);
    }
}