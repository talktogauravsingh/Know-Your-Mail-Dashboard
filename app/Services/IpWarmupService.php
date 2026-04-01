<?php
namespace App\Services;

use Carbon\Carbon;

class IpWarmupService
{
    public function getDailyLimit($ip)
    {
        if (!$ip->warmup_start_at) {
            return 1000; // fully warmed
        }

        $days = Carbon::parse($ip->warmup_start_at)->diffInDays(now());

        return match (true) {
            $days < 1 => 20,
            $days < 2 => 50,
            $days < 3 => 100,
            $days < 5 => 300,
            default => 1000,
        };
    }
}