<?php

namespace Database\Seeders;

use App\Models\Campaign;
use App\Models\Organization;
use App\Models\SendLog;
use App\Models\User;
use App\Models\SmtpConfiguration;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        $org = Organization::first();
        if (!$org) {
            $org = Organization::create(['name' => 'Default Org']);
        }

        // Create SMTP config
        $smtp = SmtpConfiguration::create([
            'organization_id' => $org->id,
            'provider' => 'AWS SES',
            'host' => 'email-smtp.us-east-1.amazonaws.com',
            'port' => 587,
            'username' => 'AKIAIOSFODNN7EXAMPLE',
            'password' => 'secret',
            'from_name' => 'Marketing Team',
            'from_address' => 'marketing@emailtracker.io',
            'is_global' => false,
        ]);

        $campaigns = [
            ['name' => 'Summer Sale 2026', 'subject' => 'Huge discounts inside!', 'status' => 'completed'],
            ['name' => 'Product Update Q2', 'subject' => 'What\'s new in EmailTracker', 'status' => 'completed'],
            ['name' => 'Welcome Sequence', 'subject' => 'Welcome to the family', 'status' => 'running'],
        ];

        foreach ($campaigns as $cData) {
            $campaign = Campaign::create([
                'organization_id' => $org->id,
                'name' => $cData['name'],
                'subject' => $cData['subject'],
                'body' => '<h1>Hello!</h1><p>Check out our latest deals.</p>',
                'status' => $cData['status'],
                'sender_config_id' => $smtp->id,
                'cta_url' => 'https://example.com/summer-sale',
            ]);

            // Generate SendLogs
            $count = rand(50, 200);
            for ($i = 0; $i < $count; $i++) {
                $sentAt = Carbon::now()->subDays(rand(0, 6))->subHours(rand(0, 23));
                $status = rand(0, 10) > 2 ? 'delivered' : 'bounced';
                $openedAt = null;
                $clicks = 0;
                
                if ($status === 'delivered') {
                    if (rand(0, 10) > 3) {
                        $openedAt = $sentAt->copy()->addMinutes(rand(5, 120));
                        if (rand(0, 10) > 5) {
                            $clicks = rand(1, 3);
                        }
                    }
                }

                SendLog::create([
                    'campaign_id' => $campaign->id,
                    'email' => "user{$i}_{$campaign->id}@example.com",
                    'status' => $status,
                    'sent_at' => $sentAt,
                    'delivered_at' => $status === 'delivered' ? $sentAt->copy()->addSeconds(rand(1, 10)) : null,
                    'opened_at' => $openedAt,
                    'clicks_count' => $clicks,
                    'region' => ['USA', 'UK', 'Germany', 'France', 'India'][rand(0, 4)],
                    'bounce_type' => $status === 'bounced' ? 'hard' : 'none',
                    'ip_used' => '127.0.0.1',
                    'tracking_data' => ['browser' => 'Chrome', 'device' => 'Desktop']
                ]);
            }
        }
    }
}
