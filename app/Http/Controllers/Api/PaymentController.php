<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\Exceptions\PaymentException;
use App\Services\Payments\Exceptions\SignatureVerificationException;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
    ) {}

    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'plan_key' => ['required', 'string', Rule::in(array_keys(config('payments.plans', [])))],
            'client_reference_id' => ['nullable', 'string', 'max:128'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
            'notes' => ['nullable', 'array'],
        ]);
        $plan = config('payments.plans.' . $validated['plan_key']);
        $validated['provider'] = config('payments.default_provider', 'razorpay');
        $validated['currency'] = $plan['currency'];
        $validated['amount_minor'] = (int) $plan['amount_minor'];
        $idempotencyHeader = $request->header('Idempotency-Key');

        if ($idempotencyHeader !== null && strlen($idempotencyHeader) > 128) {
            return response()->json(['message' => 'The Idempotency-Key header must not exceed 128 characters.'], 422);
        }

        try {
            $transaction = $this->payments->createOrder(
                $request->user(),
                $validated,
                $idempotencyHeader,
            );

            return response()->json([
                'transaction_id' => $transaction->id,
                'provider' => $transaction->provider,
                'provider_order_id' => $transaction->provider_order_id,
                'plan_key' => $validated['plan_key'],
                'amount_minor' => $transaction->amount_minor,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'razorpay_key_id' => config('services.razorpay.key'),
            ], 201);
        } catch (PaymentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        }
    }

    public function verify(Request $request)
    {
        $validated = $request->validate([
            'razorpay_order_id' => ['required', 'string', 'max:128'],
            'razorpay_payment_id' => ['required', 'string', 'max:128'],
            'razorpay_signature' => ['required', 'string', 'max:256'],
        ]);

        try {
            $transaction = $this->payments->verifyPayment($request->user(), $validated);

            return response()->json([
                'transaction_id' => $transaction->id,
                'provider_order_id' => $transaction->provider_order_id,
                'provider_payment_id' => $transaction->provider_payment_id,
                'status' => $transaction->status,
            ]);
        } catch (SignatureVerificationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (PaymentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        }
    }

    public function status(Request $request, int $transaction)
    {
        try {
            $payment = $this->payments->getStatus($request->user(), $transaction);
        } catch (PaymentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'transaction_id' => $payment->id,
            'provider' => $payment->provider,
            'provider_order_id' => $payment->provider_order_id,
            'provider_payment_id' => $payment->provider_payment_id,
            'amount_minor' => $payment->amount_minor,
            'currency' => $payment->currency,
            'status' => $payment->status,
        ]);
    }

    public function razorpayWebhook(Request $request)
    {
        try {
            $event = $this->payments->processRazorpayWebhook(
                $request->all(),
                $request->getContent(),
                $request->header('X-Razorpay-Signature'),
            );

            return response()->json([
                'status' => 'ok',
                'event_id' => $event->provider_event_id,
                'event_status' => $event->status,
            ]);
        } catch (SignatureVerificationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        }
    }
}
