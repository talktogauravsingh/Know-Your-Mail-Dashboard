<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\BulkMail;

class PasswordResetRequestController extends Controller
{
    /**
     * List pending password reset requests in the logged-in user's organization.
     */
    public function index(Request $request)
    {
        $currentUser = $request->user();

        // Only super-admin, admin, or root roles can view these requests
        if (!in_array($currentUser->role->slug, ['root', 'super-admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $requests = PasswordResetRequest::with('user.role')
            ->where('organization_id', $currentUser->organization_id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($requests);
    }

    /**
     * Approve a password reset request.
     */
    public function approve(Request $request, $id)
    {
        $currentUser = $request->user();
        $currentUser->load('role');

        if (!in_array($currentUser->role->slug, ['root', 'super-admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $resetRequest = PasswordResetRequest::where('organization_id', $currentUser->organization_id)
            ->findOrFail($id);

        if ($resetRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is already processed.'], 400);
        }

        $otp = (string) random_int(100000, 999999);

        $resetRequest->update([
            'status' => 'approved',
            'otp' => $otp,
            'otp_expires_at' => now()->addMinutes(15),
            'approved_by' => $currentUser->id,
            'approved_at' => now(),
        ]);

        // Send OTP email to the requesting user
        $user = $resetRequest->user;
        try {
            $this->sendPasswordResetOtpEmail($user, $otp);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Approved password reset OTP email failed: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Password reset request approved and OTP sent.']);
    }

    /**
     * Reject a password reset request.
     */
    public function reject(Request $request, $id)
    {
        $currentUser = $request->user();

        if (!in_array($currentUser->role->slug, ['root', 'super-admin', 'admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $resetRequest = PasswordResetRequest::where('organization_id', $currentUser->organization_id)
            ->findOrFail($id);

        if ($resetRequest->status !== 'pending') {
            return response()->json(['message' => 'Request is already processed.'], 400);
        }

        $resetRequest->update([
            'status' => 'rejected',
            'approved_by' => $currentUser->id,
            'approved_at' => now(),
        ]);

        return response()->json(['message' => 'Password reset request rejected.']);
    }

    /**
     * Send Password Reset OTP Email helper
     */
    protected function sendPasswordResetOtpEmail($user, $otp)
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
                    <p style='font-size: 14px; color: #64748b; margin: 0;'>Your administrator has approved your password reset request. Please use the OTP code below to reset your password:</p>
                </div>
                <div style='border-top: 1px solid #f1f5f9; padding-top: 24px; margin-bottom: 24px; text-align: center;'>
                    <div style='display: inline-block; padding: 16px 24px; background-color: #f8fafc; border: 1px dashed #4f46e5; border-radius: 12px; margin: 16px auto;'>
                        <span style='font-size: 32px; font-weight: 850; color: #4f46e5; letter-spacing: 6px; font-family: monospace;'>" . $otp . "</span>
                    </div>
                    <p style='font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 16px;'>This OTP is valid for 15 minutes. If you did not request a password reset, please ignore this email.</p>
                </div>
            </div>
        ";

        Mail::to($user->email)->send(new BulkMail($subject, $htmlBody));
    }
}
