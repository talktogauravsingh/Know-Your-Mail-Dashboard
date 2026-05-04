<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Recipient;
use App\Models\SendLog;
use App\Models\Conversion;
use App\Models\Organization;
use App\Models\User;
use App\Models\SmtpConfiguration;
use App\Models\CampaignVariant;
use App\Models\Suppression;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ManualTestSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing data for clean test
        SendLog::truncate();
        Conversion::truncate();

        $org = Organization::firstOrCreate(['name' => 'Manual Test Org']);
        $user = User::firstOrCreate([
            'email' => 'test@manual.com',
            'organization_id' => $org->id
        ], [
            'name' => 'Test User',
            'password' => bcrypt('password'),
        ]);

        $smtp = SmtpConfiguration::firstOrCreate([
            'organization_id' => $org->id,
            'provider' => 'Test SMTP'
        ], [
            'host' => 'smtp.test.com',
            'port' => 587,
            'username' => 'test',
            'password' => 'test',
            'from_name' => 'Test',
            'from_address' => 'test@example.com',
        ]);

        // Test Campaign 1: A/B Test
        $abCampaign = Campaign::create([
            'organization_id' => $org->id,
            'name' => 'A/B Test Campaign',
            'subject' => 'A/B Subject',
            'body' => 'A/B Body',
            'status' => 'completed',
            'sender_config_id' => $smtp->id,
            'segmentation_mode' => 'segmented',
        ]);

        CampaignVariant::create([
            'campaign_id' => $abCampaign->id,
            'name' => 'A',
            'subject' => 'Version A - Great Offer!',
            'body' => 'Click <a href="https://example.com/a">here A</a>',
            'send_percentage' => 50,
        ]);

        CampaignVariant::create([
            'campaign_id' => $abCampaign->id,
            'name' => 'B',
            'subject' => 'Version B - Special Deal!',
            'body' => 'Click <a href="https://example.com/b">here B</a>',
            'send_percentage' => 50,
        ]);

        // 100 recipients for A/B test
        $recipients = Recipient::factory(100)->create([
            'organization_id' => $org->id,
            'agent_id' => $user->id,
        ]);

        // Send logs with tracking data
        foreach ($recipients as $index => $recipient) {
            $sendLog = SendLog::create([
                'campaign_id' => $abCampaign->id,
                'email' => $recipient->email,
                'status' => 'delivered',
                'sent_at' => Carbon::now()->subHours(24),
                'delivered_at' => Carbon::now()->subHours(23),
                'ip_used' => '192.168.1.' . rand(1,255),
            ]);

            if ($index % 2 === 0) { // Variant A
                $sendLog->update(['tracking_data' => json_encode(['variant' => 'A'])]);
                if (rand(0,100) > 30) { // 70% open rate
                    $sendLog->update(['opened_at' => Carbon::now()->subHours(22)]);
                }
                if (rand(0,100) > 60) { // 40% click rate
                    $sendLog->update(['clicks_count' => 1]);
                    // Conversion for 10%
                    if (rand(0,100) > 90) {
                        Conversion::create([
                            'campaign_id' => $abCampaign->id,
                            'email' => $recipient->email,
                            'conversion_type' => 'purchase',
                            'value' => 99.99,
                            'occurred_at' => Carbon::now()->subHours(21),
                        ]);
                    }
                }
            } else { // Variant B
                $sendLog->update(['tracking_data' => json_encode(['variant' => 'B'])]);
                if (rand(0,100) > 40) { // 60% open rate
                    $sendLog->update(['opened_at' => Carbon::now()->subHours(22)]);
                }
                if (rand(0,100) > 70) { // 30% click rate
                    $sendLog->update(['clicks_count' => 1]);
                }
            }
        }

        // Test Campaign 2: High bounce campaign for testing
        $bounceCampaign = Campaign::create([
            'organization_id' => $org->id,
            'name' => 'High Bounce Test',
            'subject' => 'Bounce Test',
            'body' => 'Test bounce handling',
            'status' => 'completed',
            'sender_config_id' => $smtp->id,
        ]);

        Recipient::factory(50)->create([
            'organization_id' => $org->id,
            'agent_id' => $user->id,
        ])->each(function ($recipient) use ($bounceCampaign) {
            SendLog::create([
                'campaign_id' => $bounceCampaign->id,
                'email' => $recipient->email,
                'status' => rand(0,3) === 0 ? 'delivered' : 'bounced',
                'sent_at' => Carbon::now()->subHour(),
                'bounce_type' => 'hard',
            ]);
        });

        // Suppressions
        Suppression::factory(10)->create();

        echo "Manual test data created successfully!\n";
        echo "Login: test@manual.com / password\n";
        echo "Check campaigns: A/B test (100 recipients) and High Bounce test (50 recipients)\n";
    }
}

