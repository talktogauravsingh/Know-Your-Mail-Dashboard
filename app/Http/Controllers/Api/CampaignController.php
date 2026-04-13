<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->withCount(['sendLogs as sent' => function ($query) {
                $query->select(\DB::raw('count(distinct recipient_id)'));
            }])
            ->latest()
            ->paginate(10);

        return response()->json($campaigns);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'cta_link' => 'nullable|url',
            'sender_config_id' => 'required|exists:smtp_configurations,id', // assume exists
            'audience_segment' => 'nullable|string',
        ]);

        $campaign = Campaign::create([
            'organization_id' => Auth::user()->organization_id ?? 1,
            'name' => $validated['name'],
            'subject' => $validated['subject'],
            'body_html' => $validated['body'],
            'cta_url' => $validated['cta_link'],
            'sender_config_id' => $validated['sender_config_id'],
            'status' => 'draft',
            'user_id' => Auth::id(),
        ]);

        return response()->json($campaign->load('sendLogs'), 201);
    }

    // Add show, update, etc. later
}

