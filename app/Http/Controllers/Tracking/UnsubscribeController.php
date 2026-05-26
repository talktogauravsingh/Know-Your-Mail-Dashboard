<?php

namespace App\Http\Controllers\Tracking;

use App\Http\Controllers\Controller;
use App\Models\SendLog;
use App\Models\Suppression;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Handles one-click unsubscribes from email tracking links.
 *
 * The token in the URL is an HMAC-SHA256 of the send_log id, so it is
 * un-guessable without access to APP_KEY and cannot be forged.
 */
class UnsubscribeController extends Controller
{
    /**
     * Build a signed unsubscribe URL for a given send log.
     * Called from SendCampaignEmailJob when building the email body.
     */
    public static function buildUrl(int $sendLogId): string
    {
        $token = hash_hmac('sha256', (string) $sendLogId, config('app.key'));
        return url("/unsubscribe/{$sendLogId}/{$token}");
    }

    /**
     * Show the unsubscribe confirmation page.
     * GET /unsubscribe/{sendLogId}/{token}
     */
    public function show(Request $request, int $sendLogId, string $token)
    {
        if (!$this->validToken($sendLogId, $token)) {
            abort(403, 'Invalid unsubscribe link.');
        }

        $sendLog = SendLog::find($sendLogId);
        $email   = $sendLog?->email ?? 'your address';

        return response()->view('unsubscribe', ['email' => $email, 'sendLogId' => $sendLogId, 'token' => $token]);
    }

    /**
     * Process the unsubscribe — add to suppression list + update send log.
     * POST /unsubscribe/{sendLogId}/{token}
     */
    public function process(Request $request, int $sendLogId, string $token)
    {
        if (!$this->validToken($sendLogId, $token)) {
            abort(403, 'Invalid unsubscribe link.');
        }

        $sendLog = SendLog::find($sendLogId);

        if (!$sendLog) {
            // Already gone — still show success to avoid user confusion
            return response()->view('unsubscribed', ['email' => 'your address']);
        }

        // Prevent double-processing
        if ($sendLog->status !== 'unsubscribed') {
            $campaign = $sendLog->campaign;
            $orgId    = $campaign?->organization_id;

            if ($orgId) {
                Suppression::suppress($orgId, $sendLog->email, 'unsubscribe');
            }

            $sendLog->update(['status' => 'unsubscribed']);

            Log::info("Unsubscribed: {$sendLog->email} via send_log #{$sendLogId}");
        }

        return response()->view('unsubscribed', ['email' => $sendLog->email]);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function validToken(int $sendLogId, string $token): bool
    {
        $expected = hash_hmac('sha256', (string) $sendLogId, config('app.key'));
        return hash_equals($expected, $token);
    }
}
