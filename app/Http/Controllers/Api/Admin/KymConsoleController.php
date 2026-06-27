<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\OrganizationFeatureCredit;
use App\Models\Plan;
use App\Models\Feature;
use App\Services\FeatureGateService;
use Illuminate\Http\Request;

class KymConsoleController extends Controller
{
    /**
     * List all organizations with plans, features, and credits.
     */
    public function index(Request $request)
    {
        if ($request->user()->role?->slug !== 'root') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $organizations = Organization::with(['subscription'])->get()->map(function ($org) {
            $sub = $org->subscription;
            $credits = OrganizationFeatureCredit::where('organization_id', $org->id)->get()->map(function ($c) {
                return [
                    'feature_key' => $c->feature_key,
                    'credits_balance' => $c->credits_balance,
                ];
            });

            return [
                'id' => $org->id,
                'name' => $org->name,
                'plan_key' => $sub ? $sub->plan_key : 'free',
                'subscription_status' => $sub ? OrganizationSubscription::labelForStatus($sub->status) : 'free',
                'credits' => $credits,
            ];
        });

        $plans = Plan::where('is_active', 1)->get()->map(function ($p) {
            return [
                'key' => $p->key,
                'name' => $p->name,
            ];
        });

        $features = Feature::where('is_active', 1)->get()->map(function ($f) {
            return [
                'key' => $f->key,
                'name' => $f->name,
            ];
        });

        return response()->json([
            'organizations' => $organizations,
            'plans' => $plans,
            'features' => $features,
        ]);
    }

    /**
     * Unified update method for Org Plan, Status, and Feature Credits.
     */
    public function update(Request $request, $id)
    {
        if ($request->user()->role?->slug !== 'root') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'plan_key' => 'nullable|string',
            'status' => 'nullable|string|in:active,paused,cancelled,expired,trial,past_due,free',
            'credits' => 'nullable|array',
            'credits.*.feature_key' => 'required|string',
            'credits.*.credits_balance' => 'required|integer|min:0',
        ]);

        $org = Organization::findOrFail($id);

        // 1. Plan Update
        if ($request->has('plan_key')) {
            $planKey = $request->plan_key;
            if ($planKey !== 'free') {
                $planExists = Plan::where('key', $planKey)->exists();
                if (!$planExists) {
                    return response()->json(['message' => 'Plan not found.'], 404);
                }
            }

            OrganizationSubscription::updateOrCreate(
                ['organization_id' => $org->id],
                [
                    'plan_key' => $planKey,
                    'status' => $planKey === 'free' ? OrganizationSubscription::STATUS_CANCELLED : OrganizationSubscription::STATUS_ACTIVE,
                    'billing_interval' => 'month',
                    'amount_minor' => 0,
                    'currency' => 'INR',
                    'started_at' => now(),
                ]
            );

            // Reset default credits for new plan
            $gateService = app(FeatureGateService::class);
            $gateService->resetCreditsForOrg($org->id, $planKey);
        }

        // 2. Status Update (Pause/Resume)
        if ($request->has('status') && in_array($request->status, ['active', 'paused'])) {
            $sub = OrganizationSubscription::where('organization_id', $org->id)->first();
            if ($sub && $request->plan_key !== 'free') {
                $newStatus = $request->status === 'paused'
                    ? OrganizationSubscription::STATUS_PAUSED
                    : OrganizationSubscription::STATUS_ACTIVE;
                $sub->update(['status' => $newStatus]);
            }
        }

        // 3. Credits Update
        if ($request->has('credits')) {
            foreach ($request->credits as $creditItem) {
                $featureKey = $creditItem['feature_key'];
                $balance = $creditItem['credits_balance'];

                $feature = Feature::where('key', $featureKey)->first();
                if ($feature) {
                    OrganizationFeatureCredit::updateOrCreate(
                        [
                            'organization_id' => $org->id,
                            'feature_key' => $featureKey,
                        ],
                        [
                            'credits_balance' => $balance,
                        ]
                    );
                }
            }
        }

        return response()->json([
            'message' => 'Organization configuration updated successfully.',
        ]);
    }
}
