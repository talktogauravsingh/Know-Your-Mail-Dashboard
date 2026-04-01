<?php

namespace App\Services;

use App\Models\IpAddress;
use Illuminate\Support\Facades\Log;

class IpRotationService
{
    public function getIp()
    {
        $ips = IpAddress::where('is_active', true)->get();

        return $ips->sortByDesc(function ($ip) {
            $successRate = $ip->success_count / max($ip->send_count, 1);

            return $successRate
                - ($ip->bounce_count * 0.2)
                - ($ip->complaint_count * 0.5);
        })->random();
    }

    public function getIpForEmail($email)
    {
        $domain = substr(strrchr($email, "@"), 1);
        $ips = IpAddress::where('is_active', true)->get();
        $filtered = $ips->filter(function ($ip) use ($domain) {
            return !$ip->allowed_domains || str_contains($ip->allowed_domains, $domain);
        });
        Log::debug('[SendEmailJob] Get Email', [
                'email'         => $email,
                'ips'       => json_encode($ips),
                'filtered'  => json_encode($filtered),
        ]);
        if ($filtered->isEmpty()) {
            $filtered = $ips;
        }

        $sorted = $filtered->sortByDesc(function ($ip) {
            $successRate = $ip->success_count / max($ip->send_count, 1);

            return $successRate
                - ($ip->bounce_count * 0.2)
                - ($ip->complaint_count * 0.5);
        });
        Log::debug('[SendEmailJob] Get Email Sorted ', [
                'email'         => $email,
                'sorted'       => json_encode($sorted),
        ]);
        return $sorted->take(3)->random();
    }
}