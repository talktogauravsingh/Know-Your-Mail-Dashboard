<?php

namespace App\Services\Payments\Contracts;

interface WebhookVerificationStrategy
{
    /**
     * @param array<string,mixed> $payload Raw webhook payload parsed as array
     * @param string|null $receivedSignature Provider-specific signature header value
     */
    public function validate(array $payload, ?string $receivedSignature): bool;
}
