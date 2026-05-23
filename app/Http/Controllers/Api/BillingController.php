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
}
