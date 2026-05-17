<?php

namespace App\Services\Spam;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $apiUrl;
    private string $model = 'gemini-2.5-flash';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key');
        $this->apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent";
    }

    public function analyze(string $securePrompt): array
    {
        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl . '?key=' . $this->apiKey, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $securePrompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.1, // Highly deterministic
                    'topP' => 0.2,
                    'responseMimeType' => 'application/json',
                    'responseSchema' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'spam_score' => ['type' => 'NUMBER', 'description' => 'Spam probability from 0.0 to 1.0'],
                            'classification' => ['type' => 'STRING', 'enum' => ['clean', 'suspicious', 'likely_spam', 'malicious', 'phishing']],
                            'confidence' => ['type' => 'NUMBER', 'description' => 'Confidence score from 0.0 to 1.0'],
                            'reasons' => [
                                'type' => 'ARRAY',
                                'items' => ['type' => 'STRING'],
                                'description' => 'List of specific reasons for the score'
                            ],
                            'suggestions' => [
                                'type' => 'ARRAY',
                                'items' => ['type' => 'STRING'],
                                'description' => 'Actionable suggestions to improve deliverability'
                            ],
                            'risk_signals' => [
                                'type' => 'OBJECT',
                                'properties' => [
                                    'urgency' => ['type' => 'BOOLEAN'],
                                    'manipulation' => ['type' => 'BOOLEAN'],
                                    'prompt_injection_attempt' => ['type' => 'BOOLEAN']
                                ]
                            ]
                        ],
                        'required' => ['spam_score', 'classification', 'confidence', 'reasons', 'suggestions', 'risk_signals']
                    ]
                ]
            ]);

            if ($response->failed()) {
                Log::error('Gemini API failed', ['response' => $response->body()]);
                throw new \Exception('AI Provider Error');
            }

            $data = $response->json();
            $content = $data['candidates'][0]['content']['parts'][0]['text'] ?? '{}';
            
            return json_decode($content, true);

        } catch (\Exception $e) {
            Log::error('GeminiService exception', ['message' => $e->getMessage()]);
            // Graceful degradation
            return [
                'spam_score' => 0.5,
                'classification' => 'suspicious',
                'confidence' => 0.0,
                'reasons' => ['AI analysis temporarily unavailable'],
                'suggestions' => [],
                'risk_signals' => []
            ];
        }
    }
}
