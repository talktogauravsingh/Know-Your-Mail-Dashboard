<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\EmailAIService;
use App\Jobs\CallEmailAIGenerate;

class EmailAIController extends Controller
{
    public function generate(Request $request, EmailAIService $service)
    {
        $data = $request->validate([
            'goal' => 'sometimes|string',
            'tone' => 'sometimes|string',
            'audience' => 'sometimes|string',
            'context' => 'sometimes|string',
            'variants' => 'sometimes|integer',
            'async' => 'sometimes|boolean',
        ]);

        if (!empty($data['async'])) {
            CallEmailAIGenerate::dispatch($data);
            return response()->json(['dispatched' => true], 202);
        }

        $result = $service->generate($data);
        return response()->json($result);
    }

    public function health(EmailAIService $service)
    {
        try {
            $resp = $service->health();
            return response()->json($resp);
        } catch (\Exception $e) {
            return response()->json(['status' => 'unhealthy', 'error' => $e->getMessage()], 503);
        }
    }
}
