<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AdvancedAbuseProtection
{
    public function handle(Request $request, Closure $next): Response
    {
        // 1. IP Blocklist Check
        $ip = $request->ip();
        if (Cache::tags(['abuse'])->has("blocked_ip:{$ip}")) {
            return response()->json(['error' => 'Access denied due to suspicious activity.'], 403);
        }

        // 2. Payload Size Limits (beyond basic server limits)
        $payloadSize = mb_strlen(json_encode($request->all()));
        if ($payloadSize > 500000) { // 500KB
            $this->logAbuse($ip, 'oversized_payload', ['size' => $payloadSize]);
            return response()->json(['error' => 'Payload too large.'], 413);
        }

        // 3. Simple Honeypot Check (if applicable via headers or body)
        if ($request->has('X-Spam-Honeypot') || $request->has('_trap')) {
            $this->logAbuse($ip, 'honeypot_triggered', []);
            return response()->json(['success' => true], 200); // Fake success
        }

        // 4. Duplicate Request / Replay Protection (Sliding Window based on Hash)
        $hash = md5($request->getContent() . $ip);
        $cacheKey = "request_replay:{$hash}";
        if (Cache::has($cacheKey)) {
            return response()->json(['error' => 'Duplicate request detected.'], 429);
        }
        Cache::put($cacheKey, true, now()->addSeconds(5));

        $response = $next($request);

        return $response;
    }

    private function logAbuse(string $ip, string $threatType, array $metadata): void
    {
        Log::warning("Abuse detected: {$threatType} from {$ip}");
        
        // Log to database asynchronously if possible, or synchronously for MVP
        DB::table('abuse_tracking')->insert([
            'ip_address' => $ip,
            'threat_type' => $threatType,
            'metadata' => json_encode($metadata),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // Temporarily block IP if threat is severe
        Cache::tags(['abuse'])->put("blocked_ip:{$ip}", true, now()->addMinutes(60));
    }
}
