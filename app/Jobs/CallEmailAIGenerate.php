<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\EmailAIService;
use Illuminate\Support\Facades\Log;

class CallEmailAIGenerate implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public array $payload;
    public ?int $campaignId;

    public function __construct(array $payload, ?int $campaignId = null)
    {
        $this->payload = $payload;
        $this->campaignId = $campaignId;
    }

    public function handle(EmailAIService $service)
    {
        $result = $service->generate($this->payload);
        Log::info('EmailAI generate result', ['campaign_id' => $this->campaignId, 'result' => $result]);
        // TODO: persist results to DB or notify user
    }
}
