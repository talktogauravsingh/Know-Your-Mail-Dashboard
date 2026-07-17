<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Support\Facades\Mail;
use App\Mail\BulkMail;

class OrganizationUserController extends Controller
{
    /**
     * List all users in the logged-in user's organization.
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();

        $query = User::with('role')
            ->where('organization_id', $currentUser->organization_id)
            ->orderBy('name', 'asc');

        if ($currentUser->email !== 'techknowyourmail@gmail.com') {
            $query->where('email', '!=', 'techknowyourmail@gmail.com')
                  ->where(function($q) {
                      $q->whereNull('role_id')
                        ->orWhereNotExists(function($sub) {
                            $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                                ->from('roles')
                                ->whereColumn('users.role_id', 'roles.id')
                                ->where('slug', 'root');
                        });
                  })
                  ->whereNotExists(function($sub) {
                      $sub->select(\Illuminate\Support\Facades\DB::raw(1))
                          ->from('auth_user_roles')
                          ->join('auth_roles', 'auth_user_roles.role_id', '=', 'auth_roles.id')
                          ->whereColumn('auth_user_roles.user_id', 'users.id')
                          ->where('auth_roles.name', 'root')
                          ->where('auth_user_roles.status', 1);
                  });
        }

        $users = $query->get();

        return response()->json($users);
    }

    /**
     * Add a user to the logged-in user's organization.
     */
    public function store(Request $request)
    {
        $currentUser = $request->user();
        $currentUser->load('role');

        // Only super-admin, admin, or organization-admin roles, or those with create_manager/manage_roles permissions can add users
        if ($currentUser->role->slug !== 'root' && 
            $currentUser->role->slug !== 'super-admin' && 
            !$currentUser->hasAnyPermission(['manage_roles', 'create_manager'])) {
            return response()->json(['message' => 'Unauthorized to add organization members.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => ['required', 'string', Rules\Password::defaults()],
            'role_id' => 'required|exists:roles,id',
        ]);

        $targetRole = Role::find($validated['role_id']);

        // Check root role constraint: Only techknowyourmail@gmail.com can create a root user or assign the root role.
        if (($targetRole->slug === 'root' || strtolower($validated['email']) === 'techknowyourmail@gmail.com') && $currentUser->email !== 'techknowyourmail@gmail.com') {
            return response()->json([
                'message' => 'The root role cannot be assigned.',
                'errors' => [
                    'role_id' => ['The root role cannot be assigned.']
                ]
            ], 422);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'organization_id' => $currentUser->organization_id,
            'created_by' => $currentUser->id,
            'must_change_password' => true,
        ]);

        // Send welcome email with temporary password using campaign email architecture
        try {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.transport' => 'smtp',
                'mail.mailers.smtp.host' => env('MAIL_HOST', 'smtp.gmail.com'),
                'mail.mailers.smtp.port' => env('MAIL_PORT', 587),
                'mail.mailers.smtp.encryption' => env('MAIL_ENCRYPTION', 'tls'),
                'mail.mailers.smtp.username' => env('MAIL_USERNAME'),
                'mail.mailers.smtp.password' => env('MAIL_PASSWORD'),
                'mail.from' => [
                    'address' => env('MAIL_FROM_ADDRESS'),
                    'name' => env('MAIL_FROM_NAME'),
                ],
            ]);

            app()->forgetInstance('mail.manager');
            app()->forgetInstance('mailer');

            $subject = "Welcome! Your Temporary Account Password";
            $htmlBody = "
                <div style='font-family: \"Plus Jakarta Sans\", \"Inter\", system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>
                    <div style='text-align: center; margin-bottom: 24px;'>
                        <h2 style='font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 4px;'>Your Account Credentials</h2>
                        <p style='font-size: 14px; color: #64748b; margin: 0;'>Your team administrator has added you to the organization</p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;'>
                        <p style='font-size: 14px; line-height: 1.5; color: #334155;'>Hi " . htmlspecialchars($user->name) . ",</p>
                        <p style='font-size: 14px; line-height: 1.5; color: #334155;'>Please use the temporary credentials below to log in and set up your new password:</p>
                        <div style='background-color: #f8fafc; border: 1px dashed #4f46e5; border-radius: 12px; padding: 16px; margin: 24px 0;'>
                            <p style='font-size: 14px; margin: 0;'><strong>Email:</strong> " . htmlspecialchars($user->email) . "</p>
                            <p style='font-size: 14px; margin: 8px 0 0 0;'><strong>Temporary Password:</strong> <code style='font-family: monospace; font-size: 16px; color: #4f46e5; font-weight: bold;'>" . htmlspecialchars($validated['password']) . "</code></p>
                        </div>
                        <p style='font-size: 13px; line-height: 1.5; color: #64748b;'>For security reasons, you will be prompted to reset this temporary password immediately upon login.</p>
                    </div>
                </div>
            ";

            Mail::to($user->email)->send(new BulkMail($subject, $htmlBody));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Temporary password email failed: ' . $e->getMessage());
        }

        return response()->json($user->load('role'), 201);
    }

    /**
     * Remove a user from the logged-in user's organization.
     */
    public function destroy(Request $request, User $user)
    {
        $currentUser = $request->user();
        $currentUser->load('role');
        $user->load('role');

        // Ensure user belongs to the same organization
        if ((int)$user->organization_id !== (int)$currentUser->organization_id) {
            return response()->json(['message' => 'User does not belong to your organization.'], 403);
        }

        // Cannot delete self
        if ($user->id === $currentUser->id) {
            return response()->json(['message' => 'You cannot remove yourself.'], 400);
        }

        // Check root user constraint: Only techknowyourmail@gmail.com can remove root related users.
        $hasAuthRootRole = $user->authRoles()->where('auth_roles.name', 'root')->where('auth_user_roles.status', 1)->exists();
        if (($user->role?->slug === 'root' || $user->email === 'techknowyourmail@gmail.com' || $hasAuthRootRole) && $currentUser->email !== 'techknowyourmail@gmail.com') {
            return response()->json(['message' => 'Root users cannot be removed.'], 403);
        }

        // Only root, super-admin, or users with manage_roles permission can delete users
        if ($currentUser->role->slug !== 'root' && 
            $currentUser->role->slug !== 'super-admin' && 
            !$currentUser->hasPermission('manage_roles')) {
            return response()->json(['message' => 'Unauthorized to remove organization members.'], 403);
        }

        $user->delete();

        return response()->json(null, 204);
    }
}
