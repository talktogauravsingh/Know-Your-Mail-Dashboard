<?php

namespace App\Http\Services\Tracking;

class TrackingService
{
    public function __construct() {}

    private function detectProxy($userAgent)
    {
        $ua = strtolower($userAgent);
        if (str_contains($ua, 'googleimageproxy') || str_contains($ua, 'via ggpht.com') || str_contains($ua, 'edge/12.246')) {
            return 'Gmail Proxy';
        }
        if (str_contains($ua, 'yahoomailproxy')) {
            return 'Yahoo Proxy';
        }
        if (str_contains($ua, 'cloudflare-ua')) {
            return 'Cloudflare Proxy';
        }
        return null;
    }

    public function getBrowserName($userAgent)
    {
        $proxy = $this->detectProxy($userAgent);
        if ($proxy) {
            return $proxy;
        }

        $browsers = [
            'Edge' => 'Edge',
            'OPR' => 'Opera',
            'Opera' => 'Opera',
            'Chrome' => 'Chrome',
            'Safari' => 'Safari',
            'Firefox' => 'Firefox',
            'MSIE' => 'Internet Explorer',
            'Trident/7.0' => 'Internet Explorer 11'
        ];

        foreach ($browsers as $key => $name) {
            if (strpos($userAgent, $key) !== false) {
                return $name;
            }
        }

        return 'Unknown';
    }

    public function getOSName($userAgent)
    {
        $proxy = $this->detectProxy($userAgent);
        if ($proxy) {
            return $proxy === 'Gmail Proxy' ? 'Gmail Client' : ($proxy === 'Yahoo Proxy' ? 'Yahoo Client' : 'Proxy Server');
        }

        $oses = [
            'Windows NT 10.0' => 'Windows 10',
            'Windows NT 6.3' => 'Windows 8.1',
            'Windows NT 6.2' => 'Windows 8',
            'Windows NT 6.1' => 'Windows 7',
            'Windows NT 6.0' => 'Windows Vista',
            'Windows NT 5.1' => 'Windows XP',
            'Mac OS X' => 'Mac OS X',
            'Linux' => 'Linux',
            'Android' => 'Android',
            'iPhone' => 'iOS',
            'iPad' => 'iOS'
        ];

        foreach ($oses as $key => $name) {
            if (strpos($userAgent, $key) !== false) {
                return $name;
            }
        }

        return 'Unknown';
    }

    public function getDeviceType($userAgent)
    {
        $proxy = $this->detectProxy($userAgent);
        if ($proxy) {
            return 'Email Client (Proxy)';
        }

        if (preg_match('/mobile/i', $userAgent)) {
            return 'Mobile';
        } elseif (preg_match('/tablet/i', $userAgent)) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    }

    public function getReferrer($request)
    {
        return $request->header('Referer', 'Unknown');
    }

    public function getRegion($ip)
    {
        try {
            $response = file_get_contents('http://ip-api.com/json/' . $ip . '?fields=country,regionName');
            $data = json_decode($response, true);
            return $data['country'] ?? $data['regionName'] ?? 'Unknown';
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    public function getTrackingData($request)
    {
        $userAgent = $request->header('User-Agent');
        $ipAddress = $request->ip();
        $browser = $this->getBrowserName($userAgent);
        $os = $this->getOSName($userAgent);
        $deviceType = $this->getDeviceType($userAgent);
        $referrer = $this->getReferrer($request);

        return [
            'ip_address' => $ipAddress,
            'browser' => $browser,
            'os' => $os,
            'device_type' => $deviceType,
            'user_agent' => $userAgent,
            'referrer' => $referrer
        ];
    }

    public function logTracking(\App\Models\SendLog $sendLog, \Illuminate\Http\Request $request, $event = null)
    {
        $data = $this->getTrackingData($request);
        $existing = $sendLog->tracking_data ?? [];
        $sendLog->update([
            'tracking_data' => array_merge($existing, $data),
            'last_activity_at' => now(),
        ]);
        return $data;
    }

    public function classifyRequest(string $userAgent, string $ip): string
    {
        $ua = strtolower($userAgent);

        // 1. Bot detection
        if (str_contains($ua, 'bot') || str_contains($ua, 'spider') || str_contains($ua, 'crawler') || str_contains($ua, 'headless')) {
            return 'bot_open';
        }

        // 2. Google / Yahoo prefetch proxies
        if (str_contains($ua, 'googleimageproxy') || str_contains($ua, 'yahoomailproxy') || str_contains($ua, 'cloudflare-ua') || str_contains($ua, 'edge/12.246')) {
            return 'proxy_prefetch';
        }

        // 3. Apple Mail Privacy Protection (MPP) Heuristics
        $isAppleIP = str_starts_with($ip, '17.');
        $isAppleUA = str_contains($ua, 'macintosh; intel mac os x 10_15_7') && str_contains($ua, 'applewebkit/605.1.15') && !str_contains($ua, 'chrome');

        if ($isAppleIP || $isAppleUA) {
            return 'proxy_prefetch';
        }

        return 'human_open';
    }

    public function triggerRelayWebhook(string $recipientId, string $eventType, array $payload): void
    {
        try {
            $recipient = \App\Models\MessageRecipient::with('message')->find($recipientId);
            if (!$recipient || !$recipient->message) {
                return;
            }
            $orgId = $recipient->message->organization_id;

            $webhooks = \App\Models\Webhook::where('organization_id', $orgId)
                ->where('is_active', true)
                ->whereJsonContains('events', $eventType)
                ->get();

            foreach ($webhooks as $webhook) {
                \App\Jobs\SendRelayWebhookJob::dispatch(
                    $webhook->id,
                    \Illuminate\Support\Str::uuid()->toString(),
                    $payload
                );
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to queue webhook inside tracking service: ' . $e->getMessage());
        }
    }
}

