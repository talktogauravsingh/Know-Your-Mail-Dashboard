<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateEmailAIRequest;
use App\Http\Requests\SpamCheckEmailAIRequest;
use App\Http\Requests\RewriteEmailAIRequest;
use App\Http\Requests\ScoreEmailAIRequest;
use App\Http\Resources\EmailAIVariantResource;
use App\Models\EmailAIVariant;
use App\Services\EmailAIService;

class EmailAIController extends Controller
{
    protected EmailAIService $service;

    public function __construct(EmailAIService $service)
    {
        $this->service = $service;
    }

    public function generate(GenerateEmailAIRequest $request)
    {
        $data = $request->validated();
        $result = $this->service->generate($data);

        if (!empty($result['error'])) {
            return response()->json($result, $result['status'] ?? 500);
        }

        $variants = $this->normalizeGenerateResponse($result);

        $savedVariants = collect($variants)->map(function (array $variant) use ($data, $result) {
            return EmailAIVariant::create([
                'user_id' => auth()->id(),
                'goal' => $data['goal'] ?? null,
                'tone' => $data['tone'] ?? null,
                'audience' => $data['audience'] ?? null,
                'request_payload' => $data,
                'subject' => $variant['subject'] ?? null,
                'content' => $variant['content'] ?? null,
                'cta_suggestions' => $variant['cta_suggestions'] ?? [],
                'meta' => $variant['meta'] ?? [],
                'api_response' => $result,
            ]);
        });

        return EmailAIVariantResource::collection($savedVariants)->additional([
            'meta' => [
                'request' => $data,
                'source' => 'email-ai-service',
            ],
        ]);
    }

    public function spamCheck(SpamCheckEmailAIRequest $request)
    {
        $data = $request->validated();
        $result = $this->service->spamCheck($data);

        return response()->json($this->normalizeSpamResult($result));
    }

    public function rewrite(RewriteEmailAIRequest $request)
    {
        $data = $request->validated();
        $result = $this->service->rewrite($data);

        return response()->json($this->normalizeRewriteResult($result));
    }

    public function score(ScoreEmailAIRequest $request)
    {
        $data = $request->validated();
        $result = $this->service->score($data);

        return response()->json($this->normalizeScoreResult($result));
    }

    public function health()
    {
        try {
            $resp = $this->service->health();
            return response()->json($resp);
        } catch (\Exception $e) {
            return response()->json(['status' => 'unhealthy', 'error' => $e->getMessage()], 503);
        }
    }

    private function normalizeGenerateResponse(array $result): array
    {
        $variants = collect($result['variants'] ?? [])
            ->filter(fn ($variant) => is_array($variant))
            ->map(function ($variant) {
                return [
                    'subject' => $variant['subject'] ?? null,
                    'content' => $variant['content'] ?? null,
                    'cta_suggestions' => $variant['cta_suggestions'] ?? [],
                    'meta' => $variant['meta'] ?? [],
                ];
            })
            ->values()
            ->all();

        if (empty($variants) && (isset($result['subject']) || isset($result['content']))) {
            $variants = [[
                'subject' => $result['subject'] ?? null,
                'content' => $result['content'] ?? null,
                'cta_suggestions' => $result['cta_suggestions'] ?? [],
                'meta' => [],
            ]];
        }

        return $variants;
    }

    private function normalizeSpamResult(array $result): array
    {
        return [
            'spam_score' => $result['spam_score'] ?? null,
            'is_spam' => $result['is_spam'] ?? false,
            'reasons' => $result['reasons'] ?? [],
            'details' => $result['details'] ?? [],
        ];
    }

    private function normalizeRewriteResult(array $result): array
    {
        return [
            'rewritten_content' => $result['rewritten_content'] ?? $result['content'] ?? null,
            'meta' => $result['meta'] ?? [],
        ];
    }

    private function normalizeScoreResult(array $result): array
    {
        return [
            'score' => $result['score'] ?? null,
            'readability' => $result['readability'] ?? [],
            'suggestions' => $result['suggestions'] ?? [],
        ];
    }
}
