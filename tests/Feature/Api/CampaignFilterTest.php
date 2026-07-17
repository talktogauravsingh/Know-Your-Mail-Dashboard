<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Database\Seeders\RbacSeeder;

class CampaignFilterTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $org;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->seed(RbacSeeder::class);

        $this->org = Organization::create(['name' => 'Test Org']);
        $this->user = User::factory()->create([
            'email' => 'filtertestuser@example.com',
            'organization_id' => $this->org->id,
        ]);
        
        $this->actingAs($this->user, 'sanctum');

        // Create campaigns with different attributes
        // 1. Welcome campaign (draft, 5 days ago)
        $c1 = new Campaign([
            'organization_id' => $this->org->id,
            'name' => 'Welcome Campaign',
            'subject' => 'Welcome Subject',
            'body' => 'Welcome Body',
            'status' => 'draft',
        ]);
        $c1->created_at = now()->subDays(5);
        $c1->save();

        // 2. Newsletter (completed, 40 days ago)
        $c2 = new Campaign([
            'organization_id' => $this->org->id,
            'name' => 'Newsletter Campaign',
            'subject' => 'Newsletter Subject',
            'body' => 'Newsletter Body',
            'status' => 'completed',
        ]);
        $c2->created_at = now()->subDays(40);
        $c2->save();

        // 3. Promo (running/active, 10 days ago)
        $c3 = new Campaign([
            'organization_id' => $this->org->id,
            'name' => 'Promo Campaign',
            'subject' => 'Promo Subject',
            'body' => 'Promo Body',
            'status' => 'running',
        ]);
        $c3->created_at = now()->subDays(10);
        $c3->save();
    }

    public function test_default_filter_shows_last_30_days()
    {
        $response = $this->getJson('/api/campaigns?date_filter=30days');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(2, $data);
        $names = collect($data)->pluck('name')->toArray();
        $this->assertContains('Welcome Campaign', $names);
        $this->assertContains('Promo Campaign', $names);
        $this->assertNotContains('Newsletter Campaign', $names);
    }

    public function test_all_dates_shows_all_campaigns()
    {
        $response = $this->getJson('/api/campaigns?date_filter=all');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(3, $data);
    }

    public function test_status_completed_filter()
    {
        $response = $this->getJson('/api/campaigns?date_filter=all&status=completed');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(1, $data);
        $this->assertEquals('Newsletter Campaign', $data[0]['name']);
    }

    public function test_status_active_filter()
    {
        $response = $this->getJson('/api/campaigns?date_filter=all&status=active');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(1, $data);
        $this->assertEquals('Promo Campaign', $data[0]['name']);
    }

    public function test_search_filter()
    {
        $response = $this->getJson('/api/campaigns?date_filter=all&search=Newsletter');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(1, $data);
        $this->assertEquals('Newsletter Campaign', $data[0]['name']);
    }

    public function test_custom_date_filter()
    {
        $start = now()->subDays(45)->toDateString();
        $end = now()->subDays(35)->toDateString();
        
        $response = $this->getJson("/api/campaigns?date_filter=custom&start_date={$start}&end_date={$end}");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $this->assertCount(1, $data);
        $this->assertEquals('Newsletter Campaign', $data[0]['name']);
    }
}
