<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TriggerAutomation;
use App\Models\TriggerAutomationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TriggerAutomationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $organizationId = $request->user()->organization_id;

        $automations = TriggerAutomation::where('organization_id', $organizationId)
            ->with(['campaign', 'template'])
            ->get()
            ->map(function ($automation) {
                // Calculate trigger/delivery stats
                $stats = DB::table('trigger_automation_logs')
                    ->select(
                        DB::raw('count(*) as total'),
                        DB::raw("sum(case when status = 'success' then 1 else 0 end) as success"),
                        DB::raw("sum(case when status = 'failed' then 1 else 0 end) as failed")
                    )
                    ->where('automation_id', $automation->id)
                    ->first();

                $automation->stats = [
                    'total' => (int) ($stats->total ?? 0),
                    'success' => (int) ($stats->success ?? 0),
                    'failed' => (int) ($stats->failed ?? 0)
                ];

                return $automation;
            });

        return response()->json($automations);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9\s\-_]*$/'],
            'trigger_campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
            'trigger_variant_ids' => ['nullable', 'array'],
            'trigger_event' => ['required', 'string', 'in:open,click'],
            'trigger_click_url' => ['nullable', 'string', 'max:255'],
            'action_template_id' => ['required', 'integer', 'exists:email_templates,id'],
            'action_subject' => ['required', 'string', 'max:255'],
            'action_variable_mappings' => ['nullable', 'array'],
            'delay_hours' => ['nullable', 'integer', 'min:0'],
            'delay_minutes' => ['nullable', 'integer', 'min:0', 'max:59'],
        ]);

        $organizationId = $request->user()->organization_id;

        // Verify targeted campaign belongs to this organization
        $campaign = DB::table('campaigns')
            ->where('id', $request->trigger_campaign_id)
            ->where('organization_id', $organizationId)
            ->first();

        if (!$campaign) {
            return response()->json(['message' => 'Invalid campaign selected.'], 422);
        }

        // Verify template belongs to this organization (or is public/default)
        $template = DB::table('email_templates')
            ->where('id', $request->action_template_id)
            ->where(function ($query) use ($organizationId) {
                $query->where('organization_id', $organizationId)
                      ->orWhere('is_public', 1);
            })
            ->first();

        if (!$template) {
            return response()->json(['message' => 'Invalid email template selected.'], 422);
        }

        $data = $request->only([
            'name',
            'trigger_campaign_id',
            'trigger_variant_ids',
            'trigger_event',
            'trigger_click_url',
            'action_template_id',
            'action_subject',
            'action_variable_mappings',
            'delay_hours',
            'delay_minutes',
        ]);
        $data['organization_id'] = $organizationId;
        $data['status'] = 'draft';

        $automation = TriggerAutomation::create($data);

        return response()->json([
            'message' => 'Trigger automation created successfully',
            'data' => $automation
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
    {
        $organizationId = $request->user()->organization_id;

        // Search by ID or UUID
        $automation = TriggerAutomation::where('organization_id', $organizationId)
            ->where(function ($query) use ($id) {
                if (is_numeric($id)) {
                    $query->where('id', $id);
                } else {
                    $query->where('uuid', $id);
                }
            })
            ->with(['campaign', 'template'])
            ->first();

        if (!$automation) {
            return response()->json(['message' => 'Automation not found'], 404);
        }

        return response()->json($automation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $organizationId = $request->user()->organization_id;

        $automation = TriggerAutomation::where('organization_id', $organizationId)
            ->where(function ($query) use ($id) {
                if (is_numeric($id)) {
                    $query->where('id', $id);
                } else {
                    $query->where('uuid', $id);
                }
            })
            ->first();

        if (!$automation) {
            return response()->json(['message' => 'Automation not found'], 404);
        }

        $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[a-zA-Z0-9\s\-_]*$/'],
            'trigger_campaign_id' => ['sometimes', 'required', 'integer', 'exists:campaigns,id'],
            'trigger_variant_ids' => ['nullable', 'array'],
            'trigger_event' => ['sometimes', 'required', 'string', 'in:open,click'],
            'trigger_click_url' => ['nullable', 'string', 'max:255'],
            'action_template_id' => ['sometimes', 'required', 'integer', 'exists:email_templates,id'],
            'action_subject' => ['sometimes', 'required', 'string', 'max:255'],
            'action_variable_mappings' => ['nullable', 'array'],
            'status' => ['sometimes', 'required', 'string', 'in:draft,active,paused'],
            'delay_hours' => ['nullable', 'integer', 'min:0'],
            'delay_minutes' => ['nullable', 'integer', 'min:0', 'max:59'],
        ]);

        if ($request->has('trigger_campaign_id')) {
            // Verify campaign organization boundaries
            $campaign = DB::table('campaigns')
                ->where('id', $request->trigger_campaign_id)
                ->where('organization_id', $organizationId)
                ->first();

            if (!$campaign) {
                return response()->json(['message' => 'Invalid campaign selected.'], 422);
            }
        }

        if ($request->has('action_template_id')) {
            // Verify template organization boundaries
            $template = DB::table('email_templates')
                ->where('id', $request->action_template_id)
                ->where(function ($query) use ($organizationId) {
                    $query->where('organization_id', $organizationId)
                          ->orWhere('is_public', 1);
                })
                ->first();

            if (!$template) {
                return response()->json(['message' => 'Invalid email template selected.'], 422);
            }
        }

        $data = $request->only([
            'name',
            'trigger_campaign_id',
            'trigger_variant_ids',
            'trigger_event',
            'trigger_click_url',
            'action_template_id',
            'action_subject',
            'action_variable_mappings',
            'status',
            'delay_hours',
            'delay_minutes',
        ]);

        $automation->update($data);

        return response()->json([
            'message' => 'Trigger automation updated successfully',
            'data' => $automation
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $id)
    {
        $organizationId = $request->user()->organization_id;

        $automation = TriggerAutomation::where('organization_id', $organizationId)
            ->where(function ($query) use ($id) {
                if (is_numeric($id)) {
                    $query->where('id', $id);
                } else {
                    $query->where('uuid', $id);
                }
            })
            ->first();

        if (!$automation) {
            return response()->json(['message' => 'Automation not found'], 404);
        }

        $automation->delete();

        return response()->json([
            'message' => 'Trigger automation deleted successfully'
        ]);
    }

    /**
     * Toggle the status of the specified automation.
     */
    public function toggle(Request $request, $id)
    {
        $organizationId = $request->user()->organization_id;

        $automation = TriggerAutomation::where('organization_id', $organizationId)
            ->where(function ($query) use ($id) {
                if (is_numeric($id)) {
                    $query->where('id', $id);
                } else {
                    $query->where('uuid', $id);
                }
            })
            ->first();

        if (!$automation) {
            return response()->json(['message' => 'Automation not found'], 404);
        }

        $newStatus = $automation->status === 'active' ? 'paused' : 'active';
        $automation->update(['status' => $newStatus]);

        return response()->json([
            'message' => 'Automation status updated successfully',
            'status' => $newStatus,
            'data' => $automation
        ]);
    }
}
