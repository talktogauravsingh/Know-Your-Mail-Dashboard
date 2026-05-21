<?php

namespace App\Jobs;

use App\Models\PaymentProviderEvent;
use App\Services\Payments\PaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessRazorpayWebhookEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $paymentProviderEventId,
    ) {}

    public function handle(PaymentService $payments): void
    {
        $payments->processStoredRazorpayWebhookEvent($this->paymentProviderEventId);
    }

    public function failed(?\Throwable $exception): void
    {
        PaymentProviderEvent::whereKey($this->paymentProviderEventId)->update([
            'status' => 'FAILED',
            'failure_reason' => $exception ? substr($exception->getMessage(), 0, 1000) : 'Webhook processing failed.',
        ]);
    }
}
