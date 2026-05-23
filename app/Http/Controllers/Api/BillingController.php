<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BillingService;
use App\Services\Payments\Exceptions\PaymentException;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(
        private readonly BillingService $billing,
    ) {}

    public function summary(Request $request)
    {
        try {
            return response()->json($this->billing->getSummaryForUser($request->user()));
        } catch (PaymentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function plans()
    {
        return response()->json([
            'plans' => $this->billing->getPublicPlans(),
        ]);
    }

    public function history(Request $request)
    {
        $organizationId = (int) $request->user()->organization_id;

        if ($organizationId <= 0) {
            return response()->json(['message' => 'User is not attached to an organization.'], 422);
        }

        $transactions = \App\Models\PaymentTransaction::where('organization_id', $organizationId)
            ->where('status', \App\Models\PaymentTransaction::STATUS_PAID)
            ->latest('id')
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->id,
                    'provider_order_id' => $tx->provider_order_id,
                    'provider_payment_id' => $tx->provider_payment_id,
                    'currency' => $tx->currency,
                    'amount_minor' => $tx->amount_minor,
                    'billing_action' => data_get($tx->request_payload, 'billing_action', 'new_plan'),
                    'plan_key' => data_get($tx->request_payload, 'plan_key'),
                    'contact_count' => data_get($tx->request_payload, 'contact_count'),
                    'created_at' => $tx->created_at->toIso8601String(),
                ];
            });

        return response()->json($transactions);
    }
}
