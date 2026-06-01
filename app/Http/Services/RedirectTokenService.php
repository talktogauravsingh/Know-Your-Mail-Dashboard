<?php

namespace App\Http\Services;

use Illuminate\Support\Str;
use Carbon\Carbon;

class RedirectTokenService
{
    /**
     * Generate a signed redirect token.
     * Token contains: campaign_id|cta_redirect_id|timestamp|signature
     */
    public static function generate($campaignId, $ctaRedirectId = null, $expiresInDays = 30)
    {
        $timestamp = now()->getTimestamp();
        $expiresAt = now()->addDays($expiresInDays)->getTimestamp();
        
        $payload = implode('|', [
            $campaignId,
            $ctaRedirectId ?? 'null',
            $timestamp,
            $expiresAt,
        ]);

        $signature = self::sign($payload);
        
        // Encode as URL-safe base64
        $token = base64_encode($payload . '|' . $signature);
        $token = rtrim(strtr($token, '+/', '-_'), '=');
        
        return $token;
    }

    /**
     * Validate and decode a signed redirect token.
     * Returns array with campaign_id, cta_redirect_id, timestamp, or null if invalid.
     */
    public static function validate($token)
    {
        try {
            // Decode from URL-safe base64
            $decoded = base64_decode(
                strtr($token, '-_', '+/') . str_repeat('=', (4 - strlen($token) % 4) % 4),
                true
            );

            if (!$decoded) {
                return null;
            }

            $parts = explode('|', $decoded);
            if (count($parts) !== 5) {
                return null;
            }

            list($campaignId, $ctaRedirectId, $timestamp, $expiresAt, $signature) = $parts;

            $payload = implode('|', [
                $campaignId,
                $ctaRedirectId,
                $timestamp,
                $expiresAt,
            ]);

            if (!hash_equals(self::sign($payload), $signature)) {
                return null;
            }

            if (now()->getTimestamp() > $expiresAt) {
                return null;
            }

            return [
                'campaign_id' => (int) $campaignId,
                'cta_redirect_id' => $ctaRedirectId !== 'null' ? (int) $ctaRedirectId : null,
                'issued_at' => Carbon::createFromTimestamp($timestamp),
                'expires_at' => Carbon::createFromTimestamp($expiresAt),
            ];
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Sign a payload using HMAC-SHA256.
     */
    private static function sign($payload)
    {
        $secret = config('app.key');
        return hash_hmac('sha256', $payload, $secret);
    }
}
