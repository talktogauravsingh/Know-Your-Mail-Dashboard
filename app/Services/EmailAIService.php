<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Models\AiLog;

class EmailAIService
{
    protected $ttl = 1800;
    protected $maxHistory = 10;

    public function handle($sessionId, $userPrompt, $userId = null)
    {
        $history = $this->getSessionHistory($sessionId);

        try {
            $messages = $this->buildMessages($history, $userPrompt);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . config('services.nvidia.api_key'),
                'Content-Type' => 'application/json',
            ])->post('https://integrate.api.nvidia.com/v1/chat/completions', [
                'model' => 'mistralai/mixtral-8x7b-instruct-v0.1',
                'messages' => $messages,
                'temperature' => 0.7,
            ]);

            if (!$response->successful()) {
                throw new \Exception($response->body());
            }

            $result = $response->json();

            $assistantText = $result['choices'][0]['message']['content'] ?? '';

            $text = $this->formatResponse($assistantText);

        } catch (\Exception $e) {
            return [
                'subject' => '',
                'content' => 'AI service temporarily unavailable',
                'error' => true,
                'message' => $e->getMessage()
            ];
        }

        $this->storeInSession($sessionId, 'user', $userPrompt);
        $this->storeInSession($sessionId, 'assistant', $assistantText);

        $this->storeLog($sessionId, 'user', $userPrompt, $userId);
        $this->storeLog($sessionId, 'assistant', $assistantText, $userId);

        return $text;
    }

    private function buildMessages($history, $userPrompt)
    {
        $messages = [
            [
                'role' => 'system',
                'content' => $this->systemPrompt()
            ]
        ];

        $lastRole = null;

        foreach ($history as $msg) {
            if (!in_array($msg['role'], ['user', 'assistant'])) {
                continue;
            }

            if ($msg['role'] === $lastRole) {
                continue;
            }

            $messages[] = [
                'role' => $msg['role'],
                'content' => $msg['content']
            ];

            $lastRole = $msg['role'];
        }

        if ($lastRole === 'user') {
            $messages[count($messages) - 1]['content'] .= "\n\n" . $userPrompt;
        } else {
            $messages[] = [
                'role' => 'user',
                'content' => $userPrompt
            ];
        }

        return $messages;
    }

    private function systemPrompt()
    {
        return "
        You are a professional email generator.

        STRICT RULES:
        - Always return valid JSON
        - No markdown
        - No explanation
        - No extra text

        LOGIC:
        - If only content → generate subject
        - If only subject → generate content
        - If raw context → generate both
        - If refinement instruction → improve previous response

        FORMAT:
        {
            \"subject\": \"\",
            \"content\": \"\"
        }
        ";
    }

    private function getSessionHistory($sessionId)
    {
        return Cache::get("ai_session_$sessionId", []);
    }

    private function storeInSession($sessionId, $role, $content)
    {
        $history = Cache::get("ai_session_$sessionId", []);

        if (!empty($history) && end($history)['role'] === $role) {
            return;
        }

        $history[] = [
            'role' => $role,
            'content' => $content
        ];

        $history = array_slice($history, -$this->maxHistory);

        Cache::put("ai_session_$sessionId", $history, $this->ttl);
    }

    private function storeLog($sessionId, $role, $content, $userId)
    {
        AiLog::create([
            'user_id' => $userId,
            'session_id' => $sessionId,
            'role' => $role,
            'content' => $content
        ]);
    }

    private function formatResponse($text)
    {
        $decoded = json_decode($text, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            return [
                'subject' => $decoded['subject'] ?? '',
                'content' => $decoded['content'] ?? ''
            ];
        }

        $repaired = $this->repairJson($text);

        if ($repaired) {
            return $repaired;
        }

        return [
            'subject' => '',
            'content' => $text,
            'raw' => true
        ];
    }

    private function repairJson($text)
    {
        if (preg_match('/\{.*\}/s', $text, $matches)) {
            $decoded = json_decode($matches[0], true);

            if (json_last_error() === JSON_ERROR_NONE) {
                return [
                    'subject' => $decoded['subject'] ?? '',
                    'content' => $decoded['content'] ?? ''
                ];
            }
        }

        return null;
    }

    public function clearSession($sessionId)
    {
        Cache::forget("ai_session_$sessionId");
    }
}