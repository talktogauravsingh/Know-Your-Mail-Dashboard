<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EmailAIService
{
    protected string $base;
    protected ?string $key;
    protected int $timeout;

    public function __construct()
    {
        $this->base = config('email_ai.base_url');
        $this->key = config('email_ai.api_key');
        $this->timeout = (int) config('email_ai.timeout', 10);
    }

    public function generate(array $payload): array
    {
        $response = Http::withHeaders([
            'X-API-Key' => $this->key,
            'Accept' => 'application/json',
        ])->timeout($this->timeout)
          ->post(rtrim($this->base, '/') . '/api/v1/email/generate', $payload);

        if ($response->successful()) {
            return $response->json();
        }

        return [
            'error' => true,
            'status' => $response->status(),
            'body' => $response->body(),
        ];
    }

    public function spamCheck(array $payload): array
    {
        $response = Http::withHeaders([
            'X-API-Key' => $this->key,
            'Accept' => 'application/json',
        ])->timeout($this->timeout)
          ->post(rtrim($this->base, '/') . '/api/v1/spam/check', $payload);

        if ($response->successful()) {
            return $response->json();
        }

        return ['error' => true, 'status' => $response->status(), 'body' => $response->body()];
    }

    public function rewrite(array $payload): array
    {
        $response = Http::withHeaders([
            'X-API-Key' => $this->key,
            'Accept' => 'application/json',
        ])->timeout($this->timeout)
          ->post(rtrim($this->base, '/') . '/api/v1/email/rewrite', $payload);

        if ($response->successful()) {
            return $response->json();
        }

        return ['error' => true, 'status' => $response->status(), 'body' => $response->body()];
    }

    public function score(array $payload): array
    {
        $response = Http::withHeaders([
            'X-API-Key' => $this->key,
            'Accept' => 'application/json',
        ])->timeout($this->timeout)
          ->post(rtrim($this->base, '/') . '/api/v1/email/score', $payload);

        if ($response->successful()) {
            return $response->json();
        }

        return ['error' => true, 'status' => $response->status(), 'body' => $response->body()];
    }

    public function health(): array
    {
        $response = Http::withHeaders(['X-API-Key' => $this->key])
            ->timeout($this->timeout)
            ->get(rtrim($this->base, '/') . '/api/v1/health');

        if ($response->successful()) {
            return $response->json();
        }

        abort(503, 'AI service health check failed');
    }
}
