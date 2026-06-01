<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Services\RedirectTokenService;
use App\Models\Campaign;
use App\Models\CtaRedirect;
use App\Models\Conversion;
use App\Models\SdkApiKey;
use App\Models\TrackingSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CtaRedirectController extends Controller
{
    /**
     * POST /api/cta/redirect
     * Records a CTA redirect and returns a 302 to the destination.
     */
    public function redirect(Request $request)
    {
        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'campaign_name' => 'nullable|string|max:191',
            'email' => 'nullable|email',
            'redirect_url' => 'nullable|url',
            'destination_url' => 'required|url',
            'conversion_point' => 'nullable|string|max:191',
            'attribution_window_days' => 'nullable|integer|min:1|max:365',
            'metadata' => 'nullable|array',
        ]);

        $campaign = Campaign::findOrFail($validated['campaign_id']);

        $attributionWindow = $validated['attribution_window_days'] ?? 30;

        $ctaRedirect = CtaRedirect::create([
            'uuid' => Str::uuid()->toString(),
            'campaign_id' => $campaign->id,
            'organization_id' => $campaign->organization_id,
            'email' => $validated['email'] ?? null,
            'redirect_url' => $validated['redirect_url'] ?? $request->headers->get('referer'),
            'destination_url' => $validated['destination_url'],
            'conversion_point' => $validated['conversion_point'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'user_agent' => $request->userAgent(),
            'ip_address' => $request->ip(),
            'attribution_window_days' => $attributionWindow,
        ]);

        $trackingToken = Str::random(32);
        $sessionId = Str::uuid()->toString();

        TrackingSession::create([
            'session_id' => $sessionId,
            'cta_redirect_id' => $ctaRedirect->id,
            'tracking_token' => $trackingToken,
            'device_fingerprint' => $this->generateDeviceFingerprint($request),
            'clicked_at' => now(),
            'expires_at' => now()->addDays($attributionWindow),
            'attribution_window_days' => $attributionWindow,
        ]);

        $cookie = cookie(
            'mailtracker_cta',
            json_encode([
                'tracking_token' => $trackingToken,
                'session_id' => $sessionId,
                'campaign_id' => $campaign->id,
            ]),
            60 * 24 * $attributionWindow,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'None'
        );

        Log::info("CTA redirect recorded", [
            'redirect_id' => $ctaRedirect->id,
            'tracking_token' => substr($trackingToken, 0, 8),
            'campaign_id' => $campaign->id,
        ]);

        return redirect($validated['destination_url'])->cookie($cookie);
    }

    /**
     * GET /r/{token}
     * Email-friendly GET redirect using signed tokens.
     */
    public function getRedirect(Request $request, $token)
    {
        $tokenData = RedirectTokenService::validate($token);
        if (!$tokenData) {
            Log::warning('Invalid or expired redirect token', ['token' => substr($token, 0, 10)]);
            return response('Invalid or expired redirect link.', 410);
        }

        $campaign = Campaign::find($tokenData['campaign_id']);
        if (!$campaign) {
            Log::warning('Campaign not found for redirect token', ['campaign_id' => $tokenData['campaign_id']]);
            return response('Campaign not found.', 404);
        }

        $validated = $request->validate([
            'destination_url' => 'required|url',
            'email' => 'nullable|email',
            'conversion_point' => 'nullable|string|max:191',
            'metadata' => 'nullable|array',
        ]);

        $ctaRedirect = CtaRedirect::create([
            'uuid' => Str::uuid()->toString(),
            'campaign_id' => $campaign->id,
            'organization_id' => $campaign->organization_id,
            'email' => $validated['email'] ?? null,
            'redirect_url' => $request->headers->get('referer'),
            'destination_url' => $validated['destination_url'],
            'conversion_point' => $validated['conversion_point'] ?? null,
            'metadata' => $validated['metadata'] ?? null,
            'user_agent' => $request->userAgent(),
            'ip_address' => $request->ip(),
        ]);

        $trackingToken = Str::random(32);
        $sessionId = Str::uuid()->toString();

        TrackingSession::create([
            'session_id' => $sessionId,
            'cta_redirect_id' => $ctaRedirect->id,
            'tracking_token' => $trackingToken,
            'device_fingerprint' => $this->generateDeviceFingerprint($request),
            'clicked_at' => now(),
            'expires_at' => $tokenData['expires_at'],
            'attribution_window_days' => $tokenData['expires_at']->diffInDays(now()),
        ]);

        $cookie = cookie(
            'mailtracker_cta',
            json_encode([
                'tracking_token' => $trackingToken,
                'session_id' => $sessionId,
                'campaign_id' => $campaign->id,
            ]),
            60 * 24 * 30,
            '/',
            null,
            app()->environment('production'),
            true,
            false,
            'None'
        );

        Log::info("GET CTA redirect recorded", [
            'redirect_id' => $ctaRedirect->id,
            'campaign_id' => $campaign->id,
            'token' => substr($token, 0, 8),
        ]);

        return redirect($validated['destination_url'])->cookie($cookie);
    }

    /**
     * Helper to generate a signed redirect token for email links.
     * POST /api/cta/generate-token
     */
    public function generateToken(Request $request)
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('manage_campaigns')) {
            abort(403, 'Insufficient permissions');
        }

        $validated = $request->validate([
            'campaign_id' => 'required|exists:campaigns,id',
            'expires_in_days' => 'nullable|integer|min:1|max:365',
        ]);

        $campaign = Campaign::forUser($user)->findOrFail($validated['campaign_id']);

        $token = RedirectTokenService::generate(
            $campaign->id,
            null,
            $validated['expires_in_days'] ?? 30
        );

        $redirectUrl = route('cta.redirect.get', ['token' => $token]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'redirect_url' => $redirectUrl,
            'expires_in_days' => $validated['expires_in_days'] ?? 30,
        ]);
    }

    /**
     * POST /api/cta/conversion
     * Records a conversion event with deduplication and attribution validation.
     */
    public function recordConversion(Request $request)
    {
        $validated = $request->validate([
            'redirect_uuid' => 'nullable|uuid|exists:cta_redirects,uuid',
            'tracking_token' => 'nullable|string',
            'event_id' => 'nullable|string|max:191',
            'email' => 'nullable|email',
            'event_type' => 'nullable|string|max:50',
            'value' => 'required|numeric|min:0|max:999999',
            'currency' => 'nullable|string|size:3',
            'metadata' => 'nullable|array|max_depth:2',
        ]);

        $ctaRedirect = $this->resolveCtaRedirect($validated);
        if (!$ctaRedirect) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to resolve CTA redirect. Provide redirect_uuid or tracking_token.',
                'code' => 'INVALID_REDIRECT',
            ], 422);
        }

        $email = $validated['email'] ?? $ctaRedirect->email;
        if (!$email) {
            return response()->json([
                'success' => false,
                'message' => 'Email is required when the redirect payload does not contain one.',
                'code' => 'MISSING_EMAIL',
            ], 422);
        }

        if (!$this->isWithinAttributionWindow($ctaRedirect)) {
            return response()->json([
                'success' => false,
                'message' => 'Conversion is outside the attribution window.',
                'code' => 'OUTSIDE_ATTRIBUTION_WINDOW',
                'window_days' => $ctaRedirect->attribution_window_days,
            ], 422);
        }

        if ($validated['event_id']) {
            $existing = Conversion::where('event_id', $validated['event_id'])->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'Conversion already recorded (deduplication)',
                    'conversion_id' => $existing->id,
                    'campaign_id' => $ctaRedirect->campaign_id,
                    'cta_redirect_id' => $ctaRedirect->id,
                    'deduplicated' => true,
                ], 200);
            }
        }

        $conversion = Conversion::create([
            'campaign_id' => $ctaRedirect->campaign_id,
            'email' => $email,
            'event_type' => $validated['event_type'] ?? 'purchase',
            'value' => $validated['value'],
            'currency' => $validated['currency'] ?? 'USD',
            'metadata' => $validated['metadata'] ?? null,
            'cta_redirect_id' => $ctaRedirect->id,
            'event_id' => $validated['event_id'] ?? null,
            'event_time' => now(),
        ]);

        if ($ctaRedirect->converted_at === null) {
            $ctaRedirect->converted_at = now();
        }

        $ctaRedirect->increment('conversion_count');
        $ctaRedirect->save();

        Log::info("Conversion recorded", [
            'conversion_id' => $conversion->id,
            'cta_redirect_id' => $ctaRedirect->id,
            'campaign_id' => $ctaRedirect->campaign_id,
            'value' => $validated['value'],
        ]);

        return response()->json([
            'success' => true,
            'conversion_id' => $conversion->id,
            'campaign_id' => $ctaRedirect->campaign_id,
            'cta_redirect_id' => $ctaRedirect->id,
            'deduplicated' => false,
        ]);
    }

    /**
     * POST /api/conversions/server-event
     * Server-side conversion API for backend integrations (payments, webhooks, CRM).
     */
    public function recordServerEvent(Request $request)
    {
        $validated = $request->validate([
            'api_key' => 'required|string',
            'tracking_token' => 'required|string',
            'event_id' => 'nullable|string|max:191',
            'email' => 'nullable|email',
            'event_type' => 'nullable|string|max:50',
            'value' => 'required|numeric|min:0|max:999999',
            'currency' => 'nullable|string|size:3',
            'metadata' => 'nullable|array|max_depth:2',
        ]);

        $apiKey = SdkApiKey::findByKeyHash($validated['api_key']);
        if (!$apiKey || $apiKey->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired API key.',
                'code' => 'INVALID_API_KEY',
            ], 401);
        }

        $trackingSession = TrackingSession::findValidByToken($validated['tracking_token']);
        if (!$trackingSession) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired tracking token.',
                'code' => 'INVALID_TRACKING_TOKEN',
            ], 422);
        }

        $ctaRedirect = $trackingSession->ctaRedirect;

        if ($ctaRedirect->organization_id !== $apiKey->organization_id) {
            return response()->json([
                'success' => false,
                'message' => 'Organization mismatch.',
                'code' => 'ORG_MISMATCH',
            ], 403);
        }

        $email = $validated['email'] ?? $ctaRedirect->email;
        if (!$email) {
            return response()->json([
                'success' => false,
                'message' => 'Email is required.',
                'code' => 'MISSING_EMAIL',
            ], 422);
        }

        if ($validated['event_id']) {
            $existing = Conversion::where('event_id', $validated['event_id'])->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'Conversion already recorded (deduplication)',
                    'conversion_id' => $existing->id,
                    'deduplicated' => true,
                ], 200);
            }
        }

        $conversion = Conversion::create([
            'campaign_id' => $ctaRedirect->campaign_id,
            'email' => $email,
            'event_type' => $validated['event_type'] ?? 'purchase',
            'value' => $validated['value'],
            'currency' => $validated['currency'] ?? 'USD',
            'metadata' => $validated['metadata'] ?? null,
            'cta_redirect_id' => $ctaRedirect->id,
            'event_id' => $validated['event_id'] ?? null,
            'event_time' => now(),
        ]);

        if ($ctaRedirect->converted_at === null) {
            $ctaRedirect->converted_at = now();
        }

        $ctaRedirect->increment('conversion_count');
        $ctaRedirect->save();

        $apiKey->touch('last_used_at');

        Log::info("Server-side conversion recorded", [
            'conversion_id' => $conversion->id,
            'cta_redirect_id' => $ctaRedirect->id,
            'api_key_prefix' => $apiKey->key_prefix,
        ]);

        return response()->json([
            'success' => true,
            'conversion_id' => $conversion->id,
            'campaign_id' => $ctaRedirect->campaign_id,
            'cta_redirect_id' => $ctaRedirect->id,
        ]);
    }

    /**
     * POST /api/sdk/debug
     * Debug endpoint for SDK to introspect tracking context.
     */
    public function debug(Request $request)
    {
        $validated = $request->validate([
            'tracking_token' => 'nullable|string',
        ]);

        $result = [
            'timestamp' => now()->toIso8601String(),
            'tracking_context' => null,
            'errors' => [],
        ];

        if ($validated['tracking_token']) {
            $session = TrackingSession::findValidByToken($validated['tracking_token']);
            if ($session) {
                $redirect = $session->ctaRedirect;
                $result['tracking_context'] = [
                    'session_id' => $session->session_id,
                    'tracking_token' => substr($validated['tracking_token'], 0, 8) . '***',
                    'campaign_id' => $redirect->campaign_id,
                    'campaign_name' => $redirect->campaign()->value('name'),
                    'email' => $redirect->email,
                    'clicked_at' => $session->clicked_at->toIso8601String(),
                    'expires_at' => $session->expires_at->toIso8601String(),
                    'is_valid' => !$session->isExpired(),
                    'conversions' => $redirect->conversion_count,
                ];
            } else {
                $result['errors'][] = 'Tracking token not found or expired';
            }
        } else {
            $result['errors'][] = 'No tracking token provided';
        }

        return response()->json($result);
    }

    // Private helpers

    private function resolveCtaRedirect($validated)
    {
        if ($validated['redirect_uuid']) {
            return CtaRedirect::where('uuid', $validated['redirect_uuid'])->first();
        }

        if ($validated['tracking_token']) {
            $session = TrackingSession::findValidByToken($validated['tracking_token']);
            return $session ? $session->ctaRedirect : null;
        }

        return null;
    }

    private function isWithinAttributionWindow($ctaRedirect)
    {
        $clickedAt = $ctaRedirect->created_at;
        $expiresAt = $clickedAt->addDays($ctaRedirect->attribution_window_days);
        return now()->isBefore($expiresAt);
    }

    private function generateDeviceFingerprint($request)
    {
        return hash('sha256', implode('|', [
            $request->userAgent(),
            $request->ip(),
            $request->header('Accept-Language'),
        ]));
    }
}

