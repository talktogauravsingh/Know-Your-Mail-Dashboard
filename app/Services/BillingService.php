<?php

namespace App\Services;

use App\Models\OrganizationSubscription;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\Payments\Exceptions\PaymentException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class BillingService
{
    public function getSummaryForUser(User $user): array
    {
        $organizationId = (int) $user->organization_id;

        if ($organizationId <= 0) {
            throw new PaymentException('User is not attached to an organization.');
        }

        $subscription = OrganizationSubscription::where('organization_id', $organizationId)
            ->latest('id')
            ->first();

        $currentPlanKey = $subscription?->plan_key;
        $currentPlan = $currentPlanKey ? $this->planConfig($currentPlanKey) : null;

        $transformedPlan = $currentPlan ? $this->transformPlan($currentPlanKey, $currentPlan) : $this->freePlan();
        if ($subscription) {
            // Override with actual subscription amount (includes overage/scaling costs)
            $transformedPlan['amount_minor'] = (int) $subscription->amount_minor;

            $metaContactCount = (int) ($subscription->metadata['contact_count'] ?? 0);
            $planLimit = (int) ($currentPlan['emails_limit'] ?? 0);

            if ($metaContactCount > 0) {
                $transformedPlan['emails_limit'] = max($metaContactCount, $planLimit);
            } else {
                $transformedPlan['emails_limit'] = $planLimit;
            }
        }

        return [
            'organization_id' => $organizationId,
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'plan_key' => $subscription->plan_key,
                'plan_name' => $currentPlan['name'] ?? $subscription->plan_key,
                'status' => $subscription->status,
                'status_label' => OrganizationSubscription::labelForStatus((int) $subscription->status),
                'billing_interval' => $subscription->billing_interval,
                'amount_minor' => $subscription->amount_minor,
                'currency' => $subscription->currency,
                'started_at' => optional($subscription->started_at)->toIso8601String(),
                'renews_at' => optional($subscription->renews_at)->toIso8601String(),
                'cancelled_at' => optional($subscription->cancelled_at)->toIso8601String(),
            ] : null,
            'current_plan' => $transformedPlan,
            'cta_label' => $subscription ? 'Update Plan' : 'Add New Plan',
        ];
    }

    public function getPublicPlans(): array
    {
        return $this->plans()
            ->filter(fn (array $plan) => (bool) ($plan['is_public'] ?? true))
            ->map(fn (array $plan, string $key) => $this->transformPlan($key, $plan))
            ->values()
            ->all();
    }

    public function syncSubscriptionFromPayment(PaymentTransaction $transaction): ?OrganizationSubscription
    {
        if ($transaction->status !== PaymentTransaction::STATUS_PAID) {
            return null;
        }

        $planKey = (string) data_get($transaction->request_payload, 'plan_key', '');

        if ($planKey === '') {
            return null;
        }

        $plan = $this->planConfig($planKey);

        if ($plan === null) {
            return null;
        }

        $organizationId = (int) $transaction->organization_id;
        $now = CarbonImmutable::now();

        $subscription = OrganizationSubscription::firstOrNew([
            'organization_id' => $organizationId,
        ]);

        if ((int) $subscription->latest_payment_transaction_id === (int) $transaction->id && $subscription->plan_key === $planKey) {
            return $subscription;
        }

        $effectiveStart = $subscription->exists && $subscription->plan_key === $planKey && $subscription->renews_at && $subscription->renews_at->isFuture()
            ? CarbonImmutable::instance($subscription->renews_at)
            : $now;

        $basePriceMinor = (int) ($plan['amount_minor'] ?? 0);
        $contactCount = data_get($transaction->request_payload, 'contact_count');
        $totalAmountMinor = $basePriceMinor;

        $planEmailsLimit = (int) ($plan['emails_limit'] ?? 0);
        $finalContactCount = $contactCount ? max((int) $contactCount, $planEmailsLimit) : $planEmailsLimit;

        if ($contactCount && $planKey !== 'scale') {
            $overage = max(0, (int) $contactCount - $planEmailsLimit);
            
            $isINR = strtoupper($plan['currency'] ?? 'INR') === 'INR';
            $unitPrice = $isINR ? 0.05 : 0.001;
            
            $overageCost = $overage * $unitPrice;
            $totalAmountMinor = $basePriceMinor + (int) round($overageCost * 100);
        }

        $subscription->fill([
            'plan_key' => $planKey,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'billing_interval' => (string) ($plan['interval'] ?? 'month'),
            'amount_minor' => $totalAmountMinor,
            'currency' => strtoupper((string) ($plan['currency'] ?? 'INR')),
            'latest_payment_transaction_id' => $transaction->id,
            'started_at' => $subscription->started_at ?? $now,
            'renews_at' => $this->nextRenewalAt($effectiveStart, (string) ($plan['interval'] ?? 'month')),
            'cancelled_at' => null,
            'metadata' => [
                'activated_via' => data_get($transaction->request_payload, 'billing_action', 'new_plan'),
                'transaction_id' => $transaction->id,
                'contact_count' => $finalContactCount,
            ],
        ]);

        $subscription->save();

        return $subscription->refresh();
    }

    private function plans(): Collection
    {
        return collect(config('payments.plans', []))->sortBy(fn (array $plan) => $plan['sort_order'] ?? 999);
    }

    private function planConfig(string $planKey): ?array
    {
        $plan = config('payments.plans.' . $planKey);

        return is_array($plan) ? $plan : null;
    }

    private function transformPlan(string $planKey, array $plan): array
    {
        return [
            'key' => $planKey,
            'name' => $plan['name'] ?? $planKey,
            'description' => $plan['description'] ?? null,
            'currency' => strtoupper((string) ($plan['currency'] ?? 'INR')),
            'amount_minor' => (int) ($plan['amount_minor'] ?? 0),
            'interval' => $plan['interval'] ?? 'month',
            'emails_limit' => $plan['emails_limit'] ?? null,
            'features' => array_values($plan['features'] ?? []),
        ];
    }

    private function freePlan(): array
    {
        return [
            'key' => 'free',
            'name' => 'Free',
            'description' => 'Default workspace access before a paid plan is activated.',
            'currency' => 'INR',
            'amount_minor' => 0,
            'interval' => 'month',
            'emails_limit' => 500,
            'features' => [
                '500 emails per month',
                'Basic workspace access',
            ],
        ];
    }

    private function nextRenewalAt(CarbonImmutable $start, string $interval): CarbonImmutable
    {
        return match ($interval) {
            'year' => $start->addYear(),
            default => $start->addMonth(),
        };
    }
}
