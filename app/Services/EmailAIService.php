<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use App\Models\AiLog;
use Prism\Prism\Facades\Prism;
use Prism\Prism\ValueObjects\Messages\UserMessage;
use Prism\Prism\ValueObjects\Messages\SystemMessage;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;

class EmailAIService
{
    protected $ttl = 1800;
    protected $maxHistory = 10;

    public function handle($sessionId, $userPrompt, $userId = null)
    {
        $history = $this->getSessionHistory($sessionId);

        try {
                $response = Prism::text()
                    ->using('groq', 'llama-3.3-70b-versatile')
                    ->withMessages([
                        new SystemMessage($this->systemPrompt()),
                        ...$this->mapHistoryToMessages($history),
                        new UserMessage($userPrompt),
                    ])
                    ->asText();

                $text = $this->formatResponse($response->text);

            } catch (\Exception $e) {
                return [
                    'subject' => '',
                    'content' => 'AI service temporarily unavailable',
                    'error' => true,
                    'message' => $e->getMessage()
                ];
            }

        $this->storeInSession($sessionId, 'user', $userPrompt);
        $this->storeInSession($sessionId, 'assistant', $response->text);

        $this->storeLog($sessionId, 'user', $userPrompt, $userId);
        $this->storeLog($sessionId, 'assistant', $response->text, $userId);

        return $text;
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

        $history[] = [
            'role' => $role,
            'content' => $content
        ];

        // Keep last N messages
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
        // Extract JSON-like structure
        if (preg_match('/\{.*\}/s', $text, $matches)) {
            $json = $matches[0];

            $decoded = json_decode($json, true);

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

    private function mapHistoryToMessages($history)
    {
        $messages = [];

        foreach ($history as $msg) {
            if ($msg['role'] === 'user') {
                $messages[] = new UserMessage($msg['content']);
            } elseif ($msg['role'] === 'assistant') {
                $messages[] = new AssistantMessage($msg['content']);
            }
        }

        return $messages;
    }
}