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
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected $authRepo;

    public function __construct(AuthRepository $authRepo)
    {
        $this->authRepo = $authRepo;
    }

    /**
     * Send OTP for Email Verification
     */
    public function sendOtp(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone_number' => 'nullable|string|max:20',
        ]);

        $email = $validated['email'];
        $otp = (string) random_int(100000, 999999);

        // Store OTP in cache for 10 minutes (600 seconds)
        \Illuminate\Support\Facades\Cache::put('signup_otp_' . $email, $otp, 600);

        try {
            // Configure SMTP dynamically following the campaign email sending architecture
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

            $subject = "Verify your email address - OTP: " . $otp;
            $htmlBody = "
                <div style='font-family: \"Plus Jakarta Sans\", \"Inter\", system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);'>
                    <div style='text-align: center; margin-bottom: 24px;'>
                        <div style='display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #4f46e5; border-radius: 12px; color: #ffffff; font-size: 24px; font-weight: bold;'>E</div>
                        <h2 style='font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 4px; letter-spacing: -0.025em;'>Verify Your Email Address</h2>
                        <p style='font-size: 14px; color: #64748b; margin: 0;'>One final step to set up your account</p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px;'>
                        <p style='font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0;'>Hi " . htmlspecialchars($validated['name']) . ",</p>
                        <p style='font-size: 14px; line-height: 1.5; color: #334155;'>Welcome to Know Your Mail! Please use the verification code below to verify your email address and activate your account:</p>
                        <div style='text-align: center; padding: 16px; background-color: #f8fafc; border: 1px dashed #4f46e5; border-radius: 12px; margin: 24px 0;'>
                            <span style='font-size: 36px; font-weight: 800; color: #4f46e5; letter-spacing: 6px; font-family: monospace;'>" . $otp . "</span>
                        </div>
                        <p style='font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;'>This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.</p>
                    </div>
                    <div style='border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;'>
                        &copy; " . date('Y') . " Know Your Mail. All rights reserved.
                    </div>
                </div>
            ";

            \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\BulkMail($subject, $htmlBody));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Signup OTP email failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to send verification email. Please try again later.'
            ], 500);
        }

        return response()->json([
            'message' => 'OTP sent successfully to your email.'
        ]);
    }

    /**
     * Register User
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone_number' => 'nullable|string|max:20',
            'organization_type' => 'nullable|string|max:50',
            'organization_name' => 'nullable|string|max:255',
            'is_skipped' => 'nullable|boolean',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'otp' => 'required|string|size:6',
        ]);

        // Verify OTP
        $cachedOtp = \Illuminate\Support\Facades\Cache::get('signup_otp_' . $validated['email']);
        if (!$cachedOtp || (string) $cachedOtp !== (string) $validated['otp']) {
            return response()->json([
                'message' => 'The provided OTP is invalid or has expired.',
                'errors' => [
                    'otp' => ['The provided OTP is invalid or has expired.']
                ]
            ], 422);
        }

        // Forget OTP from cache on success
        \Illuminate\Support\Facades\Cache::forget('signup_otp_' . $validated['email']);

        $user = $this->authRepo->createUser($validated);

        $token = $user->createToken('auth-token')->plainTextToken;

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

        if ($user->must_change_password) {
            return response()->json([
                'must_change_password' => true,
                'email' => $user->email,
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Reset temporary password on login
     */
    public function resetTemporaryPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'temporary_password' => 'required|string',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if (!\Illuminate\Support\Facades\Auth::attempt([
            'email' => $validated['email'],
            'password' => $validated['temporary_password']
        ])) {
            return response()->json([
                'message' => 'The provided temporary password is incorrect.',
                'errors' => [
                    'temporary_password' => ['The provided temporary password is incorrect.']
                ]
            ], 422);
        }

        $user = \Illuminate\Support\Facades\Auth::user();

        if (!$user->must_change_password) {
            return response()->json(['message' => 'This account does not require a password reset.'], 400);
        }

        $user->password = Hash::make($validated['password']);
        $user->must_change_password = false;
        $user->save();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('role.permissions'),
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
        $user->load('role.permissions');

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
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email'
        ]);

        $user = \App\Models\User::where('email', $validated['email'])->first();
        $user->load('role');

        $isHighPrivileged = in_array($user->role->slug, ['root', 'super-admin', 'admin']);

        if ($isHighPrivileged) {
            // Directly generate OTP, cache it, and email it
            $otp = (string) random_int(100000, 999999);
            \Illuminate\Support\Facades\Cache::put('password_reset_otp_' . $user->email, $otp, 600); // 10 minutes

            // Send OTP email
            try {
                $this->sendPasswordResetOtpEmail($user, $otp);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Password reset OTP email failed: ' . $e->getMessage());
                return response()->json([
                    'message' => 'Failed to send OTP email. Please try again later.'
                ], 500);
            }

            return response()->json([
                'status' => 'otp_sent',
                'message' => 'OTP has been sent to your email address.'
            ]);
        } else {
            // Low-privileged user: Check database states first
            $approvedRequest = \App\Models\PasswordResetRequest::where('user_id', $user->id)
                ->where('status', 'approved')
                ->where('otp_expires_at', '>', now())
                ->first();

            if ($approvedRequest) {
                return response()->json([
                    'status' => 'otp_sent',
                    'message' => 'Your password reset request has been approved. Please enter the OTP sent to your email.'
                ]);
            }

            $pendingRequest = \App\Models\PasswordResetRequest::where('user_id', $user->id)
                ->where('status', 'pending')
                ->first();

            if ($pendingRequest) {
                return response()->json([
                    'status' => 'request_pending',
                    'message' => 'A password reset request is already pending administrator approval.'
                ]);
            }

            // Otherwise, create a new pending request
            \App\Models\PasswordResetRequest::create([
                'user_id' => $user->id,
                'organization_id' => $user->organization_id,
                'status' => 'pending',
            ]);

            return response()->json([
                'status' => 'request_pending',
                'message' => 'A password reset request has been sent to your organization administrator for approval.'
            ]);
        }
    }

    /**
     * Reset Password
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = \App\Models\User::where('email', $validated['email'])->first();
        $user->load('role');

        $isHighPrivileged = in_array($user->role->slug, ['root', 'super-admin', 'admin']);

        if ($isHighPrivileged) {
            // Verify OTP from Cache
            $cachedOtp = \Illuminate\Support\Facades\Cache::get('password_reset_otp_' . $user->email);
            if (!$cachedOtp || (string) $cachedOtp !== (string) $validated['otp']) {
                return response()->json([
                    'message' => 'The provided OTP is invalid or has expired.',
                    'errors' => [
                        'otp' => ['The provided OTP is invalid or has expired.']
                    ]
                ], 422);
            }

            // Reset password
            $user->password = Hash::make($validated['password']);
            $user->must_change_password = false;
            $user->save();

            \Illuminate\Support\Facades\Cache::forget('password_reset_otp_' . $user->email);

            return response()->json([
                'message' => 'Password reset successfully. You can now log in.'
            ]);
        } else {
            // Low-privileged user: Verify OTP from latest approved PasswordResetRequest
            $requestRecord = \App\Models\PasswordResetRequest::where('user_id', $user->id)
                ->where('status', 'approved')
                ->orderBy('updated_at', 'desc')
                ->first();

            if (!$requestRecord || (string) $requestRecord->otp !== (string) $validated['otp'] || $requestRecord->otp_expires_at->isPast()) {
                return response()->json([
                    'message' => 'The provided OTP is invalid or has expired.',
                    'errors' => [
                        'otp' => ['The provided OTP is invalid or has expired.']
                    ]
                ], 422);
            }

            // Reset password
            $user->password = Hash::make($validated['password']);
            $user->must_change_password = false;
            $user->save();

            // Mark request as completed
            $requestRecord->status = 'completed';
            $requestRecord->save();

            return response()->json([
                'message' => 'Password reset successfully. You can now log in.'
            ]);
        }
    }

    /**
     * Send Password Reset OTP Email
     */
    public function sendPasswordResetOtpEmail($user, $otp)
    {
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

        $subject = "Your Password Reset OTP: " . $otp;
        $htmlBody = "
            <div style='font-family: \"Plus Jakarta Sans\", \"Inter\", system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>
                <div style='text-align: center; margin-bottom: 24px;'>
                    <h2 style='font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 4px;'>Verify Your Password Reset</h2>
                    <p style='font-size: 14px; color: #64748b; margin: 0;'>Please use the OTP code below to reset your password:</p>
                </div>
                <div style='border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px; text-align: center;'>
                    <div style='display: inline-block; padding: 16px 24px; background-color: #f8fafc; border: 1px dashed #4f46e5; border-radius: 12px; margin: 16px auto;'>
                        <span style='font-size: 32px; font-weight: 850; color: #4f46e5; letter-spacing: 6px; font-family: monospace;'>" . $otp . "</span>
                    </div>
                    <p style='font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 16px;'>This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
                </div>
            </div>
        ";

        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\BulkMail($subject, $htmlBody));
    }
}
