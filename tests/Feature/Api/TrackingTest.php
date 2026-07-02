<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Organization;
use App\Models\Campaign;
use App\Models\SendLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_open_mail_tracking()
    {
        $org = Organization::create([
            'name' => 'Test Org',
        ]);

        $campaign = Campaign::create([
            'organization_id' => $org->id,
            'name' => 'Test Campaign',
            'subject' => 'Test Subject',
            'body' => 'Test body content',
            'status' => 'running',
        ]);

        $sendLog = SendLog::create([
            'campaign_id' => $campaign->id,
            'email' => 'test@example.com',
            'status' => 'delivered',
            'sent_at' => now(),
        ]);

        $response = $this->get("/api/o/{$sendLog->uuid}");

        $response->assertStatus(200)
                 ->assertHeader('Content-Type', 'image/png')
                 ->assertHeader('Cache-Control', 'must-revalidate, no-cache, no-store, private')
                 ->assertHeader('Pragma', 'no-cache')
                 ->assertHeader('Expires', '0');
    }
}

