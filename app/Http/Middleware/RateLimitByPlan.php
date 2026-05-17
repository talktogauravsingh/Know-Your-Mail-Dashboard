<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RateLimitByPlan
{
    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip();
        $apiKey = $request->header('X-API-Key');
        
        $limit = 10; // Default anonymous limit (per minute)
        $keyIdentifier = $ip;

        if ($apiKey) {
            // In a real scenario, cache this lookup
            $keyRecord = DB::table('api_keys')->where('key', hash('sha256', $apiKey))->first();
            
            if ($keyRecord) {
                // Determine limit by plan/scopes
                $scopes = json_decode($keyRecord->scopes, true) ?? [];
                if (in_array('enterprise', $scopes)) {
                    $limit = 1000;
                } else {
                    $limit = 100;
                }
                $keyIdentifier = "api_key_{$keyRecord->id}";
            }
        }

        $rateLimitKey = "spam_api:{$keyIdentifier}";

        if (RateLimiter::tooManyAttempts($rateLimitKey, $limit)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            
            // Log violation
            DB::table('abuse_tracking')->insert([
                'ip_address' => $ip,
                'threat_type' => 'rate_limit_exceeded',
                'metadata' => json_encode(['limit' => $limit]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'error' => 'Too Many Requests.',
                'retry_after' => $seconds
            ], 429);
        }

        RateLimiter::hit($rateLimitKey, 60);

        $response = $next($request);

        return $response;
    }
}
