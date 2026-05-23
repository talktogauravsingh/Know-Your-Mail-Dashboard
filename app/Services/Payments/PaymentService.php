<?php

namespace App\Services\Payments;

use App\Models\PaymentProviderEvent;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Jobs\ProcessRazorpayWebhookEventJob;
use App\Services\BillingService;
use App\Services\Payments\Contracts\PaymentProviderInterface;
use App\Services\Payments\DTO\CreateOrderInput;
use App\Services\Payments\DTO\IdempotencyKeyFactory;
use App\Services\Payments\DTO\VerifyPaymentInput;
use App\Services\Payments\Exceptions\PaymentException;
use App\Services\Payments\Exceptions\SignatureVerificationException;
use App\Services\Payments\Providers\Razorpay\RazorpayProvider;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly PaymentProviderInterface $provider,
        private readonly BillingService $billing,
    ) {}

    public function createOrder(User $user, array $data, ?string $requestIdempotencyKey = null): PaymentTransaction
    {
        $provider = $data['provider'] ?? $this->provider->providerKey();
        $idempotencyKey = $requestIdempotencyKey ?: ($data['idempotency_key'] ?? (string) Str::uuid());
        $organizationId = (int) $user->organization_id;

        if ($organizationId <= 0) {
            throw new PaymentException('User is not attached to an organization.');
        }

        return DB::transaction(function () use ($data, $idempotencyKey, $organizationId, $provider, $user) {
            $transaction = PaymentTransaction::where([
                'organization_id' => $organizationId,
                'idempotency_key' => $idempotencyKey,
                'provider' => $provider,
            ])->lockForUpdate()->first();

            if ($transaction?->provider_order_id) {
                return $transaction;
            }

            $transaction ??= PaymentTransaction::create([
                'organization_id' => $organizationId,
                'user_id' => $user->id,
                'idempotency_key' => $idempotencyKey,
                'provider' => $provider,
                'currency' => strtoupper($data['currency'] ?? 'INR'),
                'amount_minor' => (int) $data['amount_minor'],
                'client_reference_id' => $data['client_reference_id'] ?? null,
                'status' => PaymentTransaction::STATUS_ORDER_PENDING,
                'request_payload' => [
                    'plan_key' => $data['plan_key'] ?? null,
                    'billing_action' => $data['billing_action'] ?? 'new_plan',
                    'currency' => strtoupper($data['currency'] ?? 'INR'),
                    'amount_minor' => (int) $data['amount_minor'],
                    'client_reference_id' => $data['client_reference_id'] ?? null,
                ],
            ]);

            $order = $this->provider->createOrder(new CreateOrderInput(
                organizationId: $organizationId,
                userId: (int) $user->id,
                provider: $provider,
                idempotencyKey: $idempotencyKey,
                currency: $transaction->currency,
                amountMinor: $transaction->amount_minor,
                clientReferenceId: $transaction->client_reference_id,
                customerMetadata: [
                    'transaction_id' => (string) $transaction->id,
                    'plan_key' => (string) ($data['plan_key'] ?? ''),
                ],
                orderNotes: $data['notes'] ?? [],
            ));

            $transaction->update([
                'provider_order_id' => $order->providerOrderId,
                'currency' => strtoupper($order->currency),
                'amount_minor' => $order->amountMinor,
                'status' => PaymentTransaction::STATUS_ORDER_CREATED,
                'provider_metadata' => $order->providerRawResponse,
            ]);

            return $transaction->refresh();
        });
    }

    public function verifyPayment(User $user, array $data): PaymentTransaction
    {
        $organizationId = (int) $user->organization_id;
        $providerPaymentId = (string) $data['razorpay_payment_id'];

        if ($organizationId <= 0) {
            throw new PaymentException('User is not attached to an organization.');
        }

        $result = DB::transaction(function () use ($data, $organizationId, $providerPaymentId) {
            $transaction = PaymentTransaction::where('organization_id', $organizationId)
                ->where('provider_order_id', $data['razorpay_order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($transaction->status === PaymentTransaction::STATUS_PAID && $transaction->provider_payment_id === $providerPaymentId) {
                return ['transaction' => $transaction, 'verified' => true];
            }

            $verification = $this->provider->verifyPayment(new VerifyPaymentInput(
                provider: $transaction->provider,
                providerOrderId: (string) $data['razorpay_order_id'],
                providerPaymentId: $providerPaymentId,
                providerSignature: $data['razorpay_signature'] ?? null,
                idempotencyKey: IdempotencyKeyFactory::fromProviderPayment($transaction->provider, $providerPaymentId),
            ));

            $transaction->update([
                'provider_payment_id' => $providerPaymentId,
                'status' => $verification->isVerified
                    ? PaymentTransaction::STATUS_PAID
                    : PaymentTransaction::STATUS_VERIFICATION_FAILED,
                'verification_payload' => [
                    'provider_order_id' => $verification->providerOrderId,
                    'provider_payment_id' => $verification->providerPaymentId,
                    'is_verified' => $verification->isVerified,
                ],
            ]);

            return ['transaction' => $transaction->refresh(), 'verified' => $verification->isVerified];
        });

        if (!$result['verified']) {
            throw new SignatureVerificationException('Payment signature verification failed.');
        }

        $this->billing->syncSubscriptionFromPayment($result['transaction']);

        return $result['transaction'];
    }

    public function getStatus(User $user, int $transactionId): PaymentTransaction
    {
        if ((int) $user->organization_id <= 0) {
            throw new PaymentException('User is not attached to an organization.');
        }

        return PaymentTransaction::where('organization_id', (int) $user->organization_id)
            ->whereKey($transactionId)
            ->firstOrFail();
    }

    public function processRazorpayWebhook(array $payload, string $rawPayload, ?string $signature): PaymentProviderEvent
    {
        $event = $this->storeRazorpayWebhookEvent($payload, $rawPayload, $signature);

        if ($event->status === PaymentProviderEvent::STATUS_RECEIVED) {
            ProcessRazorpayWebhookEventJob::dispatch($event->id);
        }

        return $event;
    }

    public function storeRazorpayWebhookEvent(array $payload, string $rawPayload, ?string $signature): PaymentProviderEvent
    {
        $isValid = $this->provider instanceof RazorpayProvider
            ? $this->provider->validateRawWebhookSignature($rawPayload, $signature)
            : $this->provider->validateWebhookSignature($payload, $signature);

        if (!$isValid) {
            throw new SignatureVerificationException('Webhook signature verification failed.');
        }

        $eventType = (string) ($payload['event'] ?? 'unknown');
        $eventId = (string) ($payload['id'] ?? IdempotencyKeyFactory::fromProviderEvent('razorpay', hash('sha256', $rawPayload)));
        $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
        $orderEntity = $payload['payload']['order']['entity'] ?? [];
        $paymentEntity = is_array($paymentEntity) ? $paymentEntity : [];
        $orderEntity = is_array($orderEntity) ? $orderEntity : [];
        $providerOrderId = $paymentEntity['order_id'] ?? $orderEntity['id'] ?? null;
        $providerPaymentId = $paymentEntity['id'] ?? null;

        try {
            return DB::transaction(function () use ($payload, $signature, $eventType, $eventId, $providerOrderId, $providerPaymentId) {
                $existing = PaymentProviderEvent::where('provider_event_id', $eventId)->lockForUpdate()->first();
                if ($existing) {
                    return $existing;
                }

                return PaymentProviderEvent::create([
                    'organization_id' => 0,
                    'user_id' => null,
                    'provider' => 'razorpay',
                    'event_type' => $eventType,
                    'provider_event_id' => $eventId,
                    'provider_order_id' => $providerOrderId,
                    'provider_payment_id' => $providerPaymentId,
                    'provider_signature' => $signature,
                    'payload' => $this->sanitizeWebhookPayload($payload),
                    'status' => PaymentProviderEvent::STATUS_RECEIVED,
                ]);
            });
        } catch (QueryException $exception) {
            $existing = PaymentProviderEvent::where('provider_event_id', $eventId)->first();

            if ($existing) {
                return $existing;
            }

            throw $exception;
        }
    }

    public function processStoredRazorpayWebhookEvent(int $paymentProviderEventId): PaymentProviderEvent
    {
        return DB::transaction(function () use ($paymentProviderEventId) {
            $event = PaymentProviderEvent::whereKey($paymentProviderEventId)->lockForUpdate()->firstOrFail();

            if (
                $event->status === PaymentProviderEvent::STATUS_PROCESSED
                || $event->status === PaymentProviderEvent::STATUS_IGNORED
            ) {
                return $event;
            }

            $event->update(['status' => PaymentProviderEvent::STATUS_PROCESSING, 'failure_reason' => null]);

            $payload = $event->payload ?? [];
            $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
            $orderEntity = $payload['payload']['order']['entity'] ?? [];
            $paymentEntity = is_array($paymentEntity) ? $paymentEntity : [];
            $orderEntity = is_array($orderEntity) ? $orderEntity : [];
            $providerOrderId = $event->provider_order_id ?: ($paymentEntity['order_id'] ?? $orderEntity['id'] ?? null);
            $providerPaymentId = $event->provider_payment_id ?: ($paymentEntity['id'] ?? null);

            $transaction = PaymentTransaction::where('provider', 'razorpay')
                ->when($providerOrderId, fn ($query) => $query->where('provider_order_id', $providerOrderId))
                ->when(!$providerOrderId && $providerPaymentId, fn ($query) => $query->where('provider_payment_id', $providerPaymentId))
                ->lockForUpdate()
                ->first();

            if (!$transaction) {
                $event->update(['status' => PaymentProviderEvent::STATUS_IGNORED]);

                return $event->refresh();
            }

            $transaction->update($this->webhookTransactionUpdates(
                (string) $event->event_type,
                $providerPaymentId,
                $paymentEntity,
            ));

            $transaction = $transaction->refresh();

            if ($transaction->status === PaymentTransaction::STATUS_PAID) {
                $this->billing->syncSubscriptionFromPayment($transaction);
            }

            $event->update([
                'organization_id' => (int) $transaction->organization_id,
                'user_id' => $transaction->user_id,
                'provider_order_id' => $providerOrderId,
                'provider_payment_id' => $providerPaymentId,
                'status' => PaymentProviderEvent::STATUS_PROCESSED,
            ]);

            return $event->refresh();
        });
    }

    private function webhookTransactionUpdates(string $eventType, ?string $providerPaymentId, array $paymentEntity): array
    {
        $status = match ($eventType) {
            'payment.captured', 'order.paid' => PaymentTransaction::STATUS_PAID,
            'payment.failed' => PaymentTransaction::STATUS_FAILED,
            'payment.authorized' => PaymentTransaction::STATUS_AUTHORIZED,
            default => null,
        };

        return array_filter([
            'provider_payment_id' => $providerPaymentId,
            'status' => $status,
            'provider_metadata' => ['last_webhook_payment_status' => $paymentEntity['status'] ?? null],
        ], fn ($value) => $value !== null);
    }

    private function sanitizeWebhookPayload(array $payload): array
    {
        unset($payload['account_id']);

        return $payload;
    }
}
