<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\User;
use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Services\FeatureGateService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Schema\Blueprint;

class FeatureGateTest extends TestCase
{
    protected $user;
    protected $organization;
    protected $gateService;

    /**
     * Override database migrations setup to bypass pre-existing recipients table bug in SQLite.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // 1. Pre-create the missing recipients table if not exists
        $schema = $this->app['db']->connection()->getSchemaBuilder();
        if (!$schema->hasTable('recipients')) {
            $schema->create('recipients', function (Blueprint $table) {
                $table->id();
                $table->string('email')->index();
                $table->string('name')->nullable();
                $table->timestamps();
            });
        }

        // 2. Run migrations
        $this->artisan('migrate');

        // 3. Seed data
        $this->seed(DatabaseSeeder::class);
        $this->artisan('billing:sync-plans');

        $this->user = User::factory()->create();
        $this->organization = Organization::create([
            'name' => 'Test Organization',
        ]);
        $this->user->update(['organization_id' => $this->organization->id]);

        $this->gateService = app(FeatureGateService::class);
    }

    public function test_free_tier_has_basic_features_and_proper_limits()
    {
        // Free tier has custom_domain and ai_generation with limits
        $this->assertTrue($this->gateService->hasAccess('custom_domain', $this->organization->id));
        $this->assertTrue($this->gateService->hasAccess('ai_generation', $this->organization->id));

        // Free tier does not have advanced_analytics or track_conversions
        $this->assertFalse($this->gateService->hasAccess('advanced_analytics', $this->organization->id));
        $this->assertFalse($this->gateService->hasAccess('track_conversions', $this->organization->id));

        // Free tier domain limit is 1, AI credits is 2
        $quotaDomain = $this->gateService->checkQuota('custom_domain', $this->organization->id);
        $this->assertEquals(1, $quotaDomain['remaining']);

        $quotaAi = $this->gateService->checkQuota('ai_generation', $this->organization->id);
        $this->assertEquals(2, $quotaAi['remaining']);
    }

    public function test_can_consume_credits_and_fails_when_exhausted()
    {
        $orgId = $this->organization->id;

        // Balance starts at 2
        $this->assertTrue($this->gateService->consumeCredit('ai_generation', $orgId, 1));
        $quota = $this->gateService->checkQuota('ai_generation', $orgId);
        $this->assertEquals(1, $quota['remaining']);

        // Consume remaining
        $this->assertTrue($this->gateService->consumeCredit('ai_generation', $orgId, 1));
        $quota = $this->gateService->checkQuota('ai_generation', $orgId);
        $this->assertEquals(0, $quota['remaining']);

        // Consume fails
        $this->assertFalse($this->gateService->consumeCredit('ai_generation', $orgId, 1));
    }

    public function test_upgraded_subscription_updates_permissions_and_resets_credits()
    {
        $orgId = $this->organization->id;

        // Upgrade org subscription to pro
        $subscription = OrganizationSubscription::create([
            'organization_id' => $orgId,
            'plan_key' => 'pro',
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'billing_interval' => 'month',
            'amount_minor' => 99900,
            'currency' => 'INR',
        ]);

        $this->gateService->resetCreditsForOrg($orgId, 'pro');

        // Pro tier has advanced_analytics and track_conversions
        $this->assertTrue($this->gateService->hasAccess('advanced_analytics', $orgId));
        $this->assertTrue($this->gateService->hasAccess('track_conversions', $orgId));

        // Pro tier AI credits limit is 100
        $quotaAi = $this->gateService->checkQuota('ai_generation', $orgId);
        $this->assertEquals(100, $quotaAi['remaining']);
    }

    public function test_unauthorized_feature_endpoints_return_403()
    {
        $this->actingAs($this->user, 'sanctum');

        // /api/analysis/hierarchical requires advanced_analytics.
        // Since we are on Free plan (fallback), it should return 403.
        $response = $this->getJson('/api/analysis/hierarchical');
        $response->assertStatus(403);
        $response->assertJsonPath('error', 'feature_locked');
    }
}
