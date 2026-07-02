<?php

namespace App\Services;

use App\Models\Feature;
use App\Models\OrganizationSubscription;
use App\Models\OrganizationFeatureCredit;
use App\Models\Plan;

class FeatureGateService
{
    /**
     * Determine if an organization has access to a specific feature key.
     */
    public function hasAccess(string $featureKey, int $orgId): bool
    {
        if ($orgId <= 0) {
            return false;
        }

        // 1. Check feature exists and is globally active
        $feature = Feature::where('key', $featureKey)->first();
        if (!$feature || $feature->is_active !== 1) {
            return false;
        }

        // 2. Fetch active subscription
        $subscription = OrganizationSubscription::where('organization_id', $orgId)
            ->whereIn('status', [OrganizationSubscription::STATUS_ACTIVE, OrganizationSubscription::STATUS_TRIAL])
            ->first();

        $planKey = $subscription ? $subscription->plan_key : 'free';

        // 3. Resolve plan
        $plan = Plan::where('key', $planKey)->first();
        if (!$plan || $plan->is_active !== 1) {
            return false;
        }

        // 4. Resolve pivot mapping
        $planFeature = $plan->features()->where('features.id', $feature->id)->first();
        if (!$planFeature || $planFeature->pivot->is_enabled !== 1) {
            return false;
        }

        return true;
    }

    /**
     * Check feature quota balance.
     * Returns ['has_access' => bool, 'remaining' => int|null]
     */
    public function checkQuota(string $featureKey, int $orgId): array
    {
        if (!$this->hasAccess($featureKey, $orgId)) {
            return ['has_access' => false, 'remaining' => 0];
        }

        $feature = Feature::where('key', $featureKey)->first();
        $subscription = OrganizationSubscription::where('organization_id', $orgId)
            ->whereIn('status', [OrganizationSubscription::STATUS_ACTIVE, OrganizationSubscription::STATUS_TRIAL])
            ->first();
        $planKey = $subscription ? $subscription->plan_key : 'free';
        $plan = Plan::where('key', $planKey)->first();

        if (!$feature || !$plan) {
            return ['has_access' => false, 'remaining' => 0];
        }

        $planFeature = $plan->features()->where('features.id', $feature->id)->first();
        if (!$planFeature) {
            return ['has_access' => false, 'remaining' => 0];
        }

        $limitValue = $planFeature->pivot->limit_value;

        // If limit_value is null, it means unlimited
        if ($limitValue === null) {
            return ['has_access' => true, 'remaining' => null];
        }

        // Fetch organization credits balance
        $credit = OrganizationFeatureCredit::where('organization_id', $orgId)
            ->where('feature_key', $featureKey)
            ->first();

        // If no entry exists, initialize it with the plan's default limit
        if (!$credit) {
            $credit = OrganizationFeatureCredit::create([
                'organization_id' => $orgId,
                'feature_key' => $featureKey,
                'credits_balance' => $limitValue,
            ]);
        }

        return [
            'has_access' => true,
            'remaining' => $credit->credits_balance
        ];
    }

    /**
     * Consume credits for a feature.
     */
    public function consumeCredit(string $featureKey, int $orgId, int $amount = 1): bool
    {
        $quota = $this->checkQuota($featureKey, $orgId);
        if (!$quota['has_access']) {
            return false;
        }

        if ($quota['remaining'] === null) {
            // Unlimited feature
            return true;
        }

        if ($quota['remaining'] < $amount) {
            return false;
        }

        OrganizationFeatureCredit::where('organization_id', $orgId)
            ->where('feature_key', $featureKey)
            ->decrement('credits_balance', $amount);

        return true;
    }

    /**
     * Grant/add credits to an organization for a specific feature.
     */
    public function grantCredits(string $featureKey, int $orgId, int $amount): void
    {
        $credit = OrganizationFeatureCredit::where('organization_id', $orgId)
            ->where('feature_key', $featureKey)
            ->first();

        if ($credit) {
            $credit->increment('credits_balance', $amount);
        } else {
            OrganizationFeatureCredit::create([
                'organization_id' => $orgId,
                'feature_key' => $featureKey,
                'credits_balance' => $amount,
            ]);
        }
    }

    /**
     * Reset credits for an organization when their subscription starts or renews.
     */
    public function resetCreditsForOrg(int $orgId, string $planKey): void
    {
        $plan = Plan::where('key', $planKey)->with('features')->first();
        if (!$plan) {
            return;
        }

        foreach ($plan->features as $feature) {
            if ($feature->pivot->is_enabled === 1 && $feature->pivot->limit_value !== null) {
                OrganizationFeatureCredit::updateOrCreate(
                    [
                        'organization_id' => $orgId,
                        'feature_key' => $feature->key,
                    ],
                    [
                        'credits_balance' => $feature->pivot->limit_value,
                    ]
                );
            }
        }
    }
}
