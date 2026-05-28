<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\EmailTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->withCount([
                'sendLogs as sent_count',
                'sendLogs as opened_count' => function ($query) {
                    $query->whereNotNull('opened_at');
                }
            ])
            ->withSum('sendLogs as total_clicks', 'clicks_count')
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
            'template_id' => [
                'nullable',
                Rule::exists('email_templates', 'id')->where(function ($query) {
                    $query->where('organization_id', Auth::user()->organization_id ?? 1);
                }),
            ],
            'cta_link' => 'nullable',
            'sender_config_id' => 'nullable',
            'segments' => 'nullable|array',
            'segments.*.id' => 'nullable|string',
            'segments.*.filters' => 'nullable|array',
            'segments.*.filters.*.field' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_]+$/'],
            'segments.*.filters.*.field_name' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_]+$/'],
            'segments.*.filters.*.operator' => 'nullable|string',
            'segments.*.filters.*.value' => 'nullable',
            'segments.*.filters.*.field_value' => 'nullable',
            'variants' => 'nullable|array',
            'status' => 'nullable|string|in:draft,scheduled',
            'schedule_type' => 'nullable|string|in:immediate,once,recurring',
            'scheduled_at' => 'nullable|date',
            'schedule_frequency' => 'nullable|string|in:daily,weekly,monthly',
            'schedule_days' => 'nullable|array',
            'schedule_time' => 'nullable|string',
        ]);

        $campaign = Campaign::create([
            'organization_id' => Auth::user()->organization_id ?? 1,
            'name' => $validated['name'],
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'template_id' => $validated['template_id'] ?? null,
            'cta_url' => $this->formatUrl($validated['cta_link'] ?? null),
            'sender_config_id' => $validated['sender_config_id'] ?? null,
            'segmentation_mode' => $request->input('segmentation_mode', 'single'),
            'status' => $validated['status'] ?? 'draft',
            'schedule_type' => $validated['schedule_type'] ?? 'immediate',
            'scheduled_at' => $validated['scheduled_at'] ?? null,
            'schedule_frequency' => $validated['schedule_frequency'] ?? null,
            'schedule_days' => $validated['schedule_days'] ?? null,
            'schedule_time' => $validated['schedule_time'] ?? null,
            'user_id' => Auth::id(),
        ]);

        if (!empty($validated['segments'])) {
            $this->syncSegments($campaign, $validated['segments'], $validated['variants'] ?? []);
        }

        return response()->json($campaign->load('sendLogs'), 201);
    }

    public function show($id)
    {
        $campaign = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->findOrFail($id);
        
        return response()->json($campaign);
    }

    public function update(Request $request, $id)
    {
        $campaign = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'subject' => 'sometimes|required|string|max:255',
            'body' => 'sometimes|required|string',
            'template_id' => [
                'nullable',
                Rule::exists('email_templates', 'id')->where(function ($query) {
                    $query->where('organization_id', Auth::user()->organization_id ?? 1);
                }),
            ],
            'cta_link' => 'nullable|string',
            'sender_config_id' => 'nullable',
            'audience_segment' => 'nullable|string',
            'segments' => 'nullable|array',
            'segments.*.id' => 'nullable|string',
            'segments.*.filters' => 'nullable|array',
            'segments.*.filters.*.field' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_]+$/'],
            'segments.*.filters.*.field_name' => ['nullable', 'string', 'regex:/^[A-Za-z0-9_]+$/'],
            'segments.*.filters.*.operator' => 'nullable|string',
            'segments.*.filters.*.value' => 'nullable',
            'segments.*.filters.*.field_value' => 'nullable',
            'variants' => 'nullable|array',
            'status' => 'nullable|string|in:draft,scheduled',
            'schedule_type' => 'nullable|string|in:immediate,once,recurring',
            'scheduled_at' => 'nullable|date',
            'schedule_frequency' => 'nullable|string|in:daily,weekly,monthly',
            'schedule_days' => 'nullable|array',
            'schedule_time' => 'nullable|string',
        ]);

        $campaign->update([
            'name' => $validated['name'] ?? $campaign->name,
            'subject' => $validated['subject'] ?? $campaign->subject,
            'body' => $validated['body'] ?? $campaign->body,
            'template_id' => $validated['template_id'] ?? $campaign->template_id,
            'cta_url' => isset($validated['cta_link']) ? $this->formatUrl($validated['cta_link']) : $campaign->cta_url,
            'sender_config_id' => $validated['sender_config_id'] ?? $campaign->sender_config_id,
            'segmentation_mode' => $request->input('segmentation_mode', $campaign->segmentation_mode),
            'status' => $validated['status'] ?? $campaign->status,
            'schedule_type' => $validated['schedule_type'] ?? $campaign->schedule_type,
            'scheduled_at' => isset($validated['scheduled_at']) ? $validated['scheduled_at'] : $campaign->scheduled_at,
            'schedule_frequency' => $validated['schedule_frequency'] ?? $campaign->schedule_frequency,
            'schedule_days' => isset($validated['schedule_days']) ? $validated['schedule_days'] : $campaign->schedule_days,
            'schedule_time' => isset($validated['schedule_time']) ? $validated['schedule_time'] : $campaign->schedule_time,
        ]);

        if (isset($validated['segments'])) {
            $this->syncSegments($campaign, $validated['segments'], $validated['variants'] ?? []);
        }

        return response()->json($campaign);
    }

    public function insights($id)
    {
        $campaign = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->findOrFail($id);
            
        return response()->json([
            'insights' => $campaign->insights ?? []
        ]);
    }

    protected function syncSegments($campaign, $segments, $variantData)
    {
        DB::transaction(function () use ($campaign, $segments, $variantData) {
            $incomingIds = collect($segments)->pluck('id')->filter(function ($id) {
                return is_numeric($id);
            })->toArray();

            if (empty($incomingIds)) {
                $campaign->variants()->delete();
            } else {
                $campaign->variants()->whereNotIn('id', $incomingIds)->delete();
            }

            foreach ($segments as $segment) {
                $isDefault = $segment['isDefault'] ?? false;
                $segmentId = $segment['id'] ?? null;
                $custom = $segmentId !== null ? ($variantData[$segmentId] ?? []) : [];

                // 1. Create or Update Variant
                // If it's a default segment, we often link it to the campaign's main content
                // unless overrides are provided.
                if (is_numeric($segmentId)) {
                    $variant = $campaign->variants()->updateOrCreate(
                        ['id' => $segmentId],
                        [
                            'name' => $segment['name'] ?? 'Untitled Segment',
                            'subject' => $custom['subject'] ?? $campaign->subject,
                            'body' => $custom['body'] ?? $campaign->body,
                            'cta_url' => $this->formatUrl($custom['cta_link'] ?? $campaign->cta_url),
                            'is_default' => $isDefault,
                            'priority' => $segment['priority'] ?? 0,
                        ]
                    );
                } elseif ($isDefault) {
                    $variant = $campaign->variants()->updateOrCreate(
                        ['is_default' => true],
                        [
                            'name' => $segment['name'] ?? 'Untitled Segment',
                            'subject' => $custom['subject'] ?? $campaign->subject,
                            'body' => $custom['body'] ?? $campaign->body,
                            'cta_url' => $this->formatUrl($custom['cta_link'] ?? $campaign->cta_url),
                            'is_default' => $isDefault,
                            'priority' => $segment['priority'] ?? 0,
                        ]
                    );
                } else {
                    $variant = $campaign->variants()->create([
                        'name' => $segment['name'] ?? 'Untitled Segment',
                        'subject' => $custom['subject'] ?? $campaign->subject,
                        'body' => $custom['body'] ?? $campaign->body,
                        'cta_url' => $this->formatUrl($custom['cta_link'] ?? $campaign->cta_url),
                        'is_default' => $isDefault,
                        'priority' => $segment['priority'] ?? 0,
                    ]);
                }

                // 2. Sync Filters
                $variant->filterGroups()->delete(); // Simple clear and recreate
                
                if (!empty($segment['filters'])) {
                    $group = $variant->filterGroups()->create(['group_index' => 0]);
                    
                    foreach ($segment['filters'] as $filter) {
                        $fieldName = $filter['field'] ?? $filter['field_name'] ?? null;
                        if (empty($fieldName)) continue;
                        
                        $group->filters()->create([
                            'field_name' => $fieldName,
                            'operator' => $filter['operator'] ?? '=',
                            'field_value' => $filter['field_value'] ?? $filter['value'] ?? '',
                        ]);
                    }
                }
            }
        });
    }

    private function formatUrl($url)
    {
        if ($url && !preg_match('~^(?:f|ht)tps?://~i', $url)) {
            return 'https://' . ltrim($url, '/');
        }
        return $url;
    }

    /**
     * Preview campaign with merged template content.
     * Accepts template_id + body + variables and returns merged HTML.
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'template_id' => 'required|exists:email_templates,id',
            'body' => 'required|string',
            'variables' => 'nullable|array',
        ]);

        try {
            $template = EmailTemplate::where('organization_id', Auth::user()->organization_id ?? 1)
                ->findOrFail($validated['template_id']);
            
            $templateService = new \App\Services\EmailTemplateService();
            $htmlBody = $templateService->mergeWithContent(
                $template,
                $validated['body'],
                $validated['variables'] ?? []
            );

            return response()->json([
                'success' => true,
                'htmlBody' => $htmlBody,
                'template' => $template->only(['id', 'template_name', 'subject']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Preview failed: ' . $e->getMessage(),
            ], 400);
        }
    }
}
