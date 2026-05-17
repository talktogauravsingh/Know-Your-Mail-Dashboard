<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Spam\AnalyzeContentRequest;
use App\Http\Requests\Spam\AnalyzeFullIntelligenceRequest;
use App\DTOs\Spam\ContentAnalysisDTO;
use App\DTOs\Spam\FullAnalysisDTO;
use App\Services\Spam\ContentAnalyzer;
use App\Services\Spam\FullIntelligenceAnalyzer;
use App\Jobs\Spam\ProcessFullIntelligenceJob;
use Illuminate\Http\JsonResponse;

class SpamAnalysisController extends Controller
{
    public function __construct(
        private readonly ContentAnalyzer $contentAnalyzer,
        private readonly FullIntelligenceAnalyzer $fullIntelligenceAnalyzer
    ) {}

    /**
     * API 1 - Content Spam Analysis API
     * Synchronous execution for low latency (<1500ms).
     */
    public function analyzeContent(AnalyzeContentRequest $request): JsonResponse
    {
        $dto = ContentAnalysisDTO::fromRequest($request->validated());

        $startTime = microtime(true);
        $result = $this->contentAnalyzer->analyze($dto);
        $latency = round((microtime(true) - $startTime) * 1000);

        return response()->json([
            'success' => true,
            'latency_ms' => $latency,
            'data' => $result
        ]);
    }

    /**
     * API 2 - Full Spam Intelligence API
     * Can be configured to run synchronously or async via jobs.
     */
    public function analyzeFull(AnalyzeFullIntelligenceRequest $request): JsonResponse
    {
        $dto = FullAnalysisDTO::fromRequest($request->validated());

        // For large scale processing, push to Queue
        // ProcessFullIntelligenceJob::dispatch($dto);
        // return response()->json(['success' => true, 'message' => 'Analysis queued']);

        // Running synchronously for MVP
        $startTime = microtime(true);
        $result = $this->fullIntelligenceAnalyzer->analyze($dto);
        $latency = round((microtime(true) - $startTime) * 1000);

        return response()->json([
            'success' => true,
            'latency_ms' => $latency,
            'data' => $result
        ]);
    }
}
