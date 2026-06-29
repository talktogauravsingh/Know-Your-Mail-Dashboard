<?php

namespace App\Jobs;

use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendRelayWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [10, 30, 90, 300, 600];

    public function __construct(
        public string $webhookId,
        public string $eventId,
        public array $payload
    ) {}

    public function handle(): void
    {
        $webhook = Webhook::find($this->webhookId);
        if (!$webhook || !$webhook->is_active) {
            Log::info("Webhook {$this->webhookId} not found or inactive. Skipping dispatch.");
            return;
        }

        $url = $webhook->url;
        $secret = $webhook->secret;
        $bodyStr = json_encode($this->payload);
        $signature = hash_hmac('sha256', $bodyStr, $secret);

        $startTime = microtime(true);
        $responseStatus = 500;
        $responseBody = '';

        try {
            Log::info("Sending relay webhook job {$this->job->getJobId()} to {$url}");
            
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-KYM-Signature' => $signature,
                'User-Agent' => 'KnowYourMail-Webhook-Dispatcher/1.0',
            ])->timeout(10)->post($url, $this->payload);

            $responseStatus = $response->status();
            $responseBody = $response->body();

            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            // Log attempt in database
            WebhookLog::create([
                'webhook_id' => $this->webhookId,
                'event_id' => $this->eventId,
                'payload' => $this->payload,
                'response_status' => $responseStatus,
                'response_body' => substr($responseBody, 0, 1000),
                'duration_ms' => $durationMs,
            ]);

            if (!$response->successful()) {
                throw new \Exception("Webhook endpoint returned HTTP {$responseStatus}");
            }

        } catch (\Throwable $e) {
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);
            
            // Log failed attempt in database (if not already logged)
            if ($responseStatus === 500 && empty($responseBody)) {
                $responseBody = $e->getMessage();
                WebhookLog::create([
                    'webhook_id' => $this->webhookId,
                    'event_id' => $this->eventId,
                    'payload' => $this->payload,
                    'response_status' => $responseStatus,
                    'response_body' => substr($responseBody, 0, 1000),
                    'duration_ms' => $durationMs,
                ]);
            }

            Log::error("Failed to dispatch webhook to {$url}: " . $e->getMessage());
            throw $e; // Trigger retry
        }
    }
}
