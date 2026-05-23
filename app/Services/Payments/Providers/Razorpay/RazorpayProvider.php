<?php

namespace App\Services\Payments\Providers\Razorpay;

use App\Services\Payments\Contracts\PaymentProviderInterface;
use App\Services\Payments\DTO\CreateOrderInput;
use App\Services\Payments\DTO\CreateOrderOutput;
use App\Services\Payments\DTO\VerifyPaymentInput;
use App\Services\Payments\DTO\VerifyPaymentOutput;
use App\Services\Payments\Exceptions\PaymentException;
use Illuminate\Support\Facades\Http;

final class RazorpayProvider implements PaymentProviderInterface
{
    public function __construct(
        private readonly string $apiKey,
        private readonly string $apiSecret,
        private readonly RazorpayWebhookVerificationStrategy $webhookVerification,
        private readonly string $baseUrl = 'https://api.razorpay.com/v1',
    ) {}

    public function providerKey(): string
    {
        return 'razorpay';
    }

    public function createOrder(CreateOrderInput $input): CreateOrderOutput
    {
        $this->ensureConfigured();

        // 1. Create a dynamic Plan for the specific amount
        $planName = "KYM Plan " . ($input->amountMinor / 100) . " " . strtoupper($input->currency) . " (" . uniqid() . ")";
        $planResponse = Http::withBasicAuth($this->apiKey, $this->apiSecret)
            ->acceptJson()
            ->asJson()
            ->post(rtrim($this->baseUrl, '/') . '/plans', [
                'period' => 'monthly',
                'interval' => 1,
                'item' => [
                    'name' => substr($planName, 0, 50),
                    'amount' => $input->amountMinor,
                    'currency' => strtoupper($input->currency),
                ],
            ]);

        if ($planResponse->failed()) {
            throw new PaymentException('Razorpay plan creation failed: ' . $planResponse->body());
        }

        $planPayload = $planResponse->json();
        if (!is_array($planPayload) || empty($planPayload['id'])) {
            throw new PaymentException('Razorpay plan creation returned an invalid response.');
        }

        // 2. Create the Subscription using the new Plan ID
        $subResponse = Http::withBasicAuth($this->apiKey, $this->apiSecret)
            ->acceptJson()
            ->asJson()
            ->post(rtrim($this->baseUrl, '/') . '/subscriptions', [
                'plan_id' => $planPayload['id'],
                'total_count' => 120, // 10 years duration
                'customer_notify' => 1,
                'notes' => $this->sanitizeNotes(array_merge(
                    $input->customerMetadata,
                    $input->orderNotes,
                    [
                        'organization_id' => (string) $input->organizationId,
                        'user_id' => (string) $input->userId,
                        'client_reference_id' => (string) ($input->clientReferenceId ?? ''),
                    ],
                )),
            ]);

        if ($subResponse->failed()) {
            throw new PaymentException('Razorpay subscription creation failed: ' . $subResponse->body());
        }

        $payload = $subResponse->json();
        if (!is_array($payload) || empty($payload['id'])) {
            throw new PaymentException('Razorpay subscription creation returned an invalid response.');
        }

        return new CreateOrderOutput(
            providerOrderId: (string) $payload['id'],
            currency: (string) ($payload['currency'] ?? $input->currency ?? 'INR'),
            amountMinor: (int) ($input->amountMinor),
            providerRawResponse: $this->sanitizeProviderPayload($payload),
        );
    }

    public function verifyPayment(VerifyPaymentInput $input): VerifyPaymentOutput
    {
        $this->ensureConfigured();

        if (empty($input->providerSignature)) {
            return new VerifyPaymentOutput(
                providerOrderId: $input->providerOrderId,
                providerPaymentId: $input->providerPaymentId,
                isVerified: false,
                providerRawResponse: ['signature_present' => false],
            );
        }

        $expected = hash_hmac(
            'sha256',
            $input->providerOrderId . '|' . $input->providerPaymentId,
            $this->apiSecret,
        );

        $isVerified = hash_equals($expected, $input->providerSignature);

        return new VerifyPaymentOutput(
            providerOrderId: $input->providerOrderId,
            providerPaymentId: $input->providerPaymentId,
            isVerified: $isVerified,
            providerRawResponse: ['signature_present' => true],
        );
    }

    public function validateWebhookSignature(array $payload, ?string $receivedSignature): bool
    {
        return $this->webhookVerification->validate($payload, $receivedSignature);
    }

    public function validateRawWebhookSignature(string $rawPayload, ?string $receivedSignature): bool
    {
        return $this->webhookVerification->validateRawPayload($rawPayload, $receivedSignature);
    }

    private function sanitizeNotes(array $notes): array
    {
        return collect($notes)
            ->filter(fn ($value) => is_scalar($value) || $value === null)
            ->map(fn ($value) => substr((string) $value, 0, 255))
            ->all();
    }

    private function sanitizeProviderPayload(array $payload): array
    {
        unset($payload['key_secret'], $payload['secret']);

        return $payload;
    }

    private function ensureConfigured(): void
    {
        if ($this->apiKey === '' || $this->apiSecret === '') {
            throw new PaymentException('Razorpay credentials are not configured.');
        }
    }
}
