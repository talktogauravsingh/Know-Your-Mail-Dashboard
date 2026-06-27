<?php

namespace App\Http\Services\Tracking;

class TrackingService
{
    public function __construct() {}

    public function getBrowserName($userAgent)
    {
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
}

