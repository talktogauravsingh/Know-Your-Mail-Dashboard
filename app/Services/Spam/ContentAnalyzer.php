<?php

namespace App\Services\Spam;

use App\DTOs\Spam\ContentAnalysisDTO;
use Illuminate\Support\Facades\DB;

class ContentAnalyzer
{
    public function __construct(
        private readonly PromptSecurityService $securityService,
        private readonly GeminiService $geminiService
    ) {}

    public function analyze(ContentAnalysisDTO $dto): array
    {
        // 1. Secure input
        $securePrompt = $this->securityService->secureContent($dto->content, $dto->subject);

        // 2. Call AI Analysis
        $geminiResult = $this->geminiService->analyze($securePrompt);

        // 3. Post-process (e.g. override score if prompt injection detected)
        if ($geminiResult['risk_signals']['prompt_injection_attempt'] ?? false) {
            $geminiResult['spam_score'] = 1.0;
            $geminiResult['classification'] = 'malicious';
            $geminiResult['reasons'][] = 'Malicious Prompt Injection Attempt Detected';
        }

        // 4. Log to DB asynchronously (or sync for MVP)
        $this->logAnalysis($dto, $geminiResult);

        return $geminiResult;
    }

    private function logAnalysis(ContentAnalysisDTO $dto, array $result): void
    {
        $payloadHash = md5($dto->content . $dto->subject);

        DB::table('spam_analysis_history')->insert([
            'type' => 'content',
            'request_ip' => request()->ip(),
            'payload_hash' => $payloadHash,
            'spam_score' => $result['spam_score'],
            'classification' => $result['classification'],
            'reasons' => json_encode($result['reasons']),
            'raw_response' => json_encode($result),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
