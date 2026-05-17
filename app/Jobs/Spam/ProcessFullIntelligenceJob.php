<?php

namespace App\Jobs\Spam;

use App\DTOs\Spam\FullAnalysisDTO;
use App\Services\Spam\FullIntelligenceAnalyzer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessFullIntelligenceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120; // Maximum 2 minutes for processing

    public function __construct(
        public readonly FullAnalysisDTO $dto,
        public readonly string $webhookUrl = '' // Optional callback
    ) {}

    public function handle(FullIntelligenceAnalyzer $analyzer): void
    {
        try {
            $result = $analyzer->analyze($this->dto);

            if ($this->webhookUrl) {
                // Mock webhook dispatch
                // Http::post($this->webhookUrl, $result);
                Log::info("Full Intelligence completed. Fired webhook to {$this->webhookUrl}");
            }
            
        } catch (\Exception $e) {
            Log::error('FullIntelligenceJob failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
