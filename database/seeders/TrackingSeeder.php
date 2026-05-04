<?php

namespace Database\Seeders;

use App\Models\SendLog;
use App\Models\Conversion;
use App\Models\IpAddress;
use App\Models\AiLog;
use App\Models\Suppression;
use App\Models\Campaign;
use App\Models\Recipient;
use Illuminate\Database\Seeder;

class TrackingSeeder extends Seeder
{
    public function run(): void
    {
        // Generate tracking data for campaigns
        $campaigns = Campaign::with('sendLogs')->get();

        foreach ($campaigns as $campaign) {
            // Generate 100-500 send logs per campaign
            $recipientCount = rand(100, 500);
            SendLog::factory($recipientCount)->create([
                'campaign_id' => $campaign->id,
            ]);

            // Some conversions (5-10% conversion rate)
            $conversions = rand(5, 50);
            Conversion::factory($conversions)->create([
                'campaign_id' => $campaign->id,
            ]);
        }

        // IP Addresses
        IpAddress::factory(20)->create();

        // AI Logs
        AiLog::factory(50)->create();

        // Suppressions
        Suppression::factory(30)->create();

        // Add suppressions to some recipients
        $recipients = Recipient::inRandomOrder()->limit(20)->get();
        foreach ($recipients as $recipient) {
            Suppression::create([
                'email' => $recipient->email,
                'reason' => 'complaint',
            ]);
        }
    }
}

