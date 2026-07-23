<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Campaign;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CampaignFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_filter_campaigns_by_status_and_date_filter()
    {
        $org = Organization::create(['name' => 'Test Org', 'email' => 'org@test.com']);
        $user = User::create([
            'name' => 'Test User',
            'email' => 'user@test.com',
            'password' => bcrypt('password123'),
            'organization_id' => $org->id,
        ]);

        Campaign::create([
            'organization_id' => $org->id,
            'name' => 'Scheduled Campaign',
            'subject' => 'Subject 1',
            'body' => 'Body text 1',
            'status' => 'scheduled',
            'sender_config_id' => 1,
        ]);

        Campaign::create([
            'organization_id' => $org->id,
            'name' => 'Completed Campaign',
            'subject' => 'Subject 2',
            'body' => 'Body text 2',
            'status' => 'completed',
            'sender_config_id' => 1,
        ]);

        $this->actingAs($user);

        // Test status=scheduled filter
        $response = $this->getJson('/api/campaigns?page=1&status=scheduled&date_filter=all');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Scheduled Campaign', $data[0]['name']);
        $this->assertEquals('scheduled', $data[0]['status']);
    }
}
