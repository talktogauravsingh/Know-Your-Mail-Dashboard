<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\EmailAIService;
use Illuminate\Support\Str;

class EmailAIController extends Controller
{
    protected $service;

    public function __construct(EmailAIService $service)
    {
        $this->service = $service;
    }

    // Generate / refine
    public function generate(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string',
            'session_id' => 'nullable|string'
        ]);

        $sessionId = $request->session_id ?? Str::uuid()->toString();

        $result = $this->service->handle(
            $sessionId,
            $request->prompt,
            auth()->id() ?? null
        );

        return response()->json([
            'session_id' => $sessionId,
            'data' => $result
        ]);
    }

    // End session
    public function endSession(Request $request)
    {
        $request->validate([
            'session_id' => 'required|string'
        ]);

        $this->service->clearSession($request->session_id);

        return response()->json([
            'message' => 'Session cleared'
        ]);
    }
}