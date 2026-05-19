<?php

namespace App\Services\Payments\Providers\Razorpay;

use App\Services\Payments\Contracts\WebhookVerificationStrategy;
final class RazorpayWebhookVerificationStrategy implements WebhookVerificationStrategy
{
    public function __construct(
        private readonly string $webhookSecret,
    ) {}

    /**
     * Razorpay Standard Checkout uses signature header: X-Razorpay-Signature
     * and webhook verification is HMAC SHA256 over the raw payload.
     */
    public function validate(array $payload, ?string $receivedSignature): bool
    {
        $rawPayload = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($rawPayload)) {
            return false;
        }

        return $this->validateRawPayload($rawPayload, $receivedSignature);
    }

    public function validateRawPayload(string $rawPayload, ?string $receivedSignature): bool
    {
        if (empty($receivedSignature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawPayload, $this->webhookSecret);

        // Constant-time compare to reduce timing attack surface.
        return hash_equals($expected, $receivedSignature);
    }
}
