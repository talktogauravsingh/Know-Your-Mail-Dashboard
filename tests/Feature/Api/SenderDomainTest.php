<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\SenderDomain;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SenderDomainTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $org;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
        $this->artisan('billing:sync-plans');

        $this->org = Organization::create(['name' => 'Test Org']);
        $this->user = User::factory()->create([
            'email' => 'domaintestuser@example.com',
            'organization_id' => $this->org->id,
            'role_id' => \App\Models\Role::where('slug', 'super-admin')->first()->id ?? null,
        ]);
        
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_can_add_and_list_sender_domain()
    {
        $domainName = 'test-' . uniqid() . '.com';

        // 1. Store
        $response = $this->postJson('/api/domains', [
            'domain' => $domainName,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('domain', $domainName)
                 ->assertJsonStructure(['id', 'domain', 'status', 'dns_records']);

        // Verify CNAME record target is not empty and matches expected configuration
        $data = $response->json();
        $dnsRecords = $data['dns_records'];
        $cnameRecord = collect($dnsRecords)->firstWhere('type', 'CNAME');
        
        $this->assertNotNull($cnameRecord);
        $this->assertNotEmpty($cnameRecord['value']);
        
        $expectedCname = config('app.tracking_domain') ?: parse_url(config('app.url'), PHP_URL_HOST);
        $this->assertEquals($expectedCname, $cnameRecord['value']);

        // 2. List
        $responseList = $this->getJson('/api/domains');
        $responseList->assertStatus(200);
        $this->assertCount(1, $responseList->json());
    }

    public function test_can_delete_sender_domain()
    {
        $domain = SenderDomain::create([
            'organization_id' => $this->org->id,
            'domain'          => 'test-delete.com',
            'status'          => 'pending',
            'cname_target'    => 'localhost',
            'dkim_selector'   => 'kym',
            'dkim_public_key' => 'pubkey',
            'dkim_private_key'=> 'privkey',
        ]);

        $response = $this->deleteJson('/api/domains/' . $domain->id);
        $response->assertStatus(200);
        $this->assertDatabaseMissing('sender_domains', ['id' => $domain->id]);
    }
}
