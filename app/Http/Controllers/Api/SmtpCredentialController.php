<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmtpCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SmtpCredentialController extends Controller
{
    /**
     * Display a listing of SMTP credentials.
     */
    public function index(Request $request)
    {
        $organizationId = $request->user()->organization_id;

        $credentials = SmtpCredential::where('organization_id', $organizationId)
            ->with('domain')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($cred) {
                return [
                    'id' => $cred->id,
                    'username' => $cred->username,
                    'domain_id' => $cred->domain_id,
                    'domain_name' => $cred->domain?->domain,
                    'is_active' => $cred->is_active,
                    'rate_limit_per_hour' => $cred->rate_limit_per_hour,
                    'created_at' => $cred->created_at->toISOString(),
                ];
            });

        return response()->json($credentials);
    }

    /**
     * Store a newly created SMTP credential.
     */
    public function store(Request $request)
    {
        $request->validate([
            'username' => ['required', 'string', 'max:255', 'unique:smtp_credentials,username'],
            'rateLimitPerHour' => ['nullable', 'integer', 'min:100'],
            'domainId' => ['nullable', 'integer', 'exists:sender_domains,id'],
        ]);

        $organizationId = $request->user()->organization_id;
        $rawPassword = 'kym_sec_' . Str::random(24); // 32-character strong key

        $credential = SmtpCredential::create([
            'organization_id' => $organizationId,
            'username' => $request->username,
            'password_hash' => Hash::make($rawPassword),
            'domain_id' => $request->domainId,
            'is_active' => true,
            'rate_limit_per_hour' => $request->rateLimitPerHour ?? 10000,
            'encrypted_password' => \Illuminate\Support\Facades\Crypt::encryptString($rawPassword),
        ]);

        return response()->json([
            'id' => $credential->id,
            'username' => $credential->username,
            'domain_id' => $credential->domain_id,
            'is_active' => $credential->is_active,
            'rate_limit_per_hour' => $credential->rate_limit_per_hour,
            'rawPassword' => $rawPassword, // Returned ONLY once here
            'created_at' => $credential->created_at->toISOString(),
        ], 201);
    }

    /**
     * Update the specified SMTP credential (toggle active status / rate limit).
     */
    public function update(Request $request, int $id)
    {
        $credential = SmtpCredential::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'rate_limit_per_hour' => ['sometimes', 'integer', 'min:100'],
        ]);

        $credential->update($request->only(['is_active', 'rate_limit_per_hour']));

        return response()->json([
            'id' => $credential->id,
            'username' => $credential->username,
            'is_active' => $credential->is_active,
            'rate_limit_per_hour' => $credential->rate_limit_per_hour,
        ]);
    }

    /**
     * Remove the specified SMTP credential.
     */
    public function destroy(Request $request, int $id)
    {
        $credential = SmtpCredential::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        $credential->delete();

        return response()->json(['message' => 'SMTP credential revoked successfully.']);
    }

    /**
     * Send a test email using SMTP credentials through Haraka relay.
     */
    public function testSend(Request $request, int $id)
    {
        $request->validate([
            'password' => ['required', 'string'],
            'recipient_email' => ['required', 'email'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
        ]);

        $credential = SmtpCredential::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->with('domain')
            ->firstOrFail();

        // Determine sending domain
        $domain = $credential->domain;
        if (!$domain) {
            // Scoped to any domain under the organization, pick the first verified one
            $domain = \App\Models\SenderDomain::where('organization_id', $request->user()->organization_id)
                ->where('status', 'verified')
                ->first();
            
            if (!$domain) {
                return response()->json([
                    'message' => 'Please add and verify at least one sender domain under your organization first.'
                ], 422);
            }
        } else if ($domain->status !== 'verified') {
            return response()->json([
                'message' => 'The sender domain associated with this credential is not verified yet.'
            ], 422);
        }

        $fromAddress = 'test@' . $domain->domain;
        $subject = $request->subject ?? 'KnowYourMail ESMTP Test Connection';
        $body = $request->body ?? '<p>Hello!</p><p>This is a test message to confirm your ESMTP credentials are working properly with the Haraka relay service.</p>';

        try {
            // Backup current configuration
            $backupConfig = [
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'password' => config('mail.mailers.smtp.password'),
                'encryption' => config('mail.mailers.smtp.encryption'),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
            ];

            // Re-configure SMTP on the fly to target Haraka
            config([
                'mail.mailers.smtp.host' => '127.0.0.1',
                'mail.mailers.smtp.port' => 25, // Haraka SMTP port
                'mail.mailers.smtp.encryption' => null,
                'mail.mailers.smtp.username' => $credential->username,
                'mail.mailers.smtp.password' => $request->password,
                'mail.from.address' => $fromAddress,
                'mail.from.name' => 'KYM SMTP Test',
            ]);

            \Illuminate\Support\Facades\Mail::purge('smtp');

            \Illuminate\Support\Facades\Mail::mailer('smtp')
                ->to($request->recipient_email)
                ->send(new \App\Mail\BulkMail($subject, $body));

            // Restore original config
            config([
                'mail.mailers.smtp.host' => $backupConfig['host'],
                'mail.mailers.smtp.port' => $backupConfig['port'],
                'mail.mailers.smtp.username' => $backupConfig['username'],
                'mail.mailers.smtp.password' => $backupConfig['password'],
                'mail.mailers.smtp.encryption' => $backupConfig['encryption'],
                'mail.from.address' => $backupConfig['from_address'],
                'mail.from.name' => $backupConfig['from_name'],
            ]);
            \Illuminate\Support\Facades\Mail::purge('smtp');

            return response()->json([
                'message' => 'Test email sent successfully via Haraka ESMTP relay!'
            ]);

        } catch (\Exception $e) {
            // Restore original config in case of error
            if (isset($backupConfig)) {
                config([
                    'mail.mailers.smtp.host' => $backupConfig['host'],
                    'mail.mailers.smtp.port' => $backupConfig['port'],
                    'mail.mailers.smtp.username' => $backupConfig['username'],
                    'mail.mailers.smtp.password' => $backupConfig['password'],
                    'mail.mailers.smtp.encryption' => $backupConfig['encryption'],
                    'mail.from.address' => $backupConfig['from_address'],
                    'mail.from.name' => $backupConfig['from_name'],
                ]);
                \Illuminate\Support\Facades\Mail::purge('smtp');
            }

            return response()->json([
                'message' => 'SMTP Relay connection failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
