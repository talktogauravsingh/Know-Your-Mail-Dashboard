<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\EmailTemplate;
use App\Models\Recipient;
use App\Services\TemplateVariableEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->with(['variants'])
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
            'subject' => 'nullable|string|max:255',
            'body' => 'nullable|string',
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
            'segments.*.name' => 'nullable|string|max:255',
            'segments.*.isDefault' => 'nullable|boolean',
            'segments.*.priority' => 'nullable|integer',
            'segments.*.filters' => 'nullable|array',
            'segments.*.filters.*.field' => ['nullable', 'string'],
            'segments.*.filters.*.field_name' => ['nullable', 'string'],
            'segments.*.filters.*.operator' => 'nullable|string',
            'segments.*.filters.*.value' => 'nullable',
            'segments.*.filters.*.field_value' => 'nullable',
            'segments.*.name' => 'nullable|string',
            'segments.*.priority' => 'nullable|integer',
            'segments.*.isDefault' => 'nullable|boolean',
            'variants' => 'nullable|array',
            'status' => 'nullable|string|in:draft,scheduled,sent,running,completed,pending',
            'schedule_type' => 'nullable|string|in:immediate,once,recurring',
            'scheduled_at' => 'nullable|date',
            'schedule_frequency' => 'nullable|string|in:daily,weekly,monthly',
            'schedule_days' => 'nullable|array',
            'schedule_time' => 'nullable|string',
            'variable_mappings' => 'nullable|array',
            'variable_mappings.*' => 'nullable|string|max:255',
            'wizard_step' => 'nullable|integer|min:1|max:5',
            'recipient_source' => 'nullable|string|in:org,campaign',
        ]);

        $campaign = Campaign::create([
            'organization_id' => Auth::user()->organization_id ?? 1,
            'name' => $validated['name'],
            'subject' => $validated['subject'] ?? '',
            'body' => $validated['body'] ?? '',
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
            'variable_mappings' => $validated['variable_mappings'] ?? null,
            'wizard_step' => $validated['wizard_step'] ?? 1,
            'recipient_source' => $validated['recipient_source'] ?? 'campaign',
            'user_id' => Auth::id(),
        ]);

        if (!empty($validated['segments'])) {
            $this->syncSegments($campaign, $validated['segments'], $validated['variants'] ?? []);
        }

        return response()->json($campaign->load(['sendLogs', 'variants.filterGroups.filters', 'variants.template', 'template']), 201);
    }

    public function show($id)
    {
        $campaign = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->with(['variants.filterGroups.filters', 'variants.template', 'template'])
            ->findOrFail($id);

        $moduleType = $campaign->recipient_source === 'org' ? 1 : 2;
        $moduleId = $campaign->recipient_source === 'org' ? ($campaign->organization_id ?? 1) : $campaign->id;

        $insights = DB::table('campaign_csv_insights')
            ->where('module_type', $moduleType)
            ->where('module_id', $moduleId)
            ->get();
        
        $headers = $insights->pluck('field_name')->toArray();
        if (!in_array('email', $headers)) {
            array_unshift($headers, 'email');
        }
        if (!in_array('name', $headers)) {
            $headers[] = 'name';
        }
        if (!in_array('phone', $headers)) {
            $headers[] = 'phone';
        }

        $sampleRecipients = DB::table('recipients')
            ->where('module_type', $moduleType)
            ->where('module_id', $moduleId)
            ->limit(5)
            ->get();

        $previewRows = [];
        foreach ($sampleRecipients as $r) {
            $attrs = json_decode($r->attributes, true) ?: [];
            $previewRows[] = array_merge([
                'email' => $r->email,
                'name' => $r->name,
                'phone' => $r->phone,
            ], $attrs);
        }

        $totalRows = DB::table('recipients')
            ->where('module_type', $moduleType)
            ->where('module_id', $moduleId)
            ->count();
            
        $validRows = DB::table('recipients')
            ->where('module_type', $moduleType)
            ->where('module_id', $moduleId)
            ->where('is_valid', true)
            ->count();

        $invalidRows = $totalRows - $validRows;

        $campaign->recipient_preview = [
            'headers' => $headers,
            'preview_rows' => $previewRows,
            'total_rows' => $totalRows,
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
        ];
        
        return response()->json($campaign);
    }

    public function update(Request $request, $id)
    {
        $campaign = Campaign::where('organization_id', Auth::user()->organization_id ?? 1)
            ->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'subject' => 'sometimes|nullable|string|max:255',
            'body' => 'sometimes|nullable|string',
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
            'segments.*.name' => 'nullable|string|max:255',
            'segments.*.isDefault' => 'nullable|boolean',
            'segments.*.priority' => 'nullable|integer',
            'segments.*.filters' => 'nullable|array',
            'segments.*.filters.*.field' => ['nullable', 'string'],
            'segments.*.filters.*.field_name' => ['nullable', 'string'],
            'segments.*.filters.*.operator' => 'nullable|string',
            'segments.*.filters.*.value' => 'nullable',
            'segments.*.filters.*.field_value' => 'nullable',
            'segments.*.name' => 'nullable|string',
            'segments.*.priority' => 'nullable|integer',
            'segments.*.isDefault' => 'nullable|boolean',
            'variants' => 'nullable|array',
            'status' => 'nullable|string|in:draft,scheduled,sent,running,completed,pending',
            'schedule_type' => 'nullable|string|in:immediate,once,recurring',
            'scheduled_at' => 'nullable|date',
            'schedule_frequency' => 'nullable|string|in:daily,weekly,monthly',
            'schedule_days' => 'nullable|array',
            'schedule_time' => 'nullable|string',
            'variable_mappings' => 'nullable|array',
            'variable_mappings.*' => 'nullable|string|max:255',
            'wizard_step' => 'nullable|integer|min:1|max:5',
            'recipient_source' => 'nullable|string|in:org,campaign',
        ]);

        $campaign->update([
            'name' => $validated['name'] ?? $campaign->name,
            'subject' => array_key_exists('subject', $validated) ? ($validated['subject'] ?? '') : $campaign->subject,
            'body' => array_key_exists('body', $validated) ? ($validated['body'] ?? '') : $campaign->body,
            'template_id' => array_key_exists('template_id', $validated) ? $validated['template_id'] : $campaign->template_id,
            'cta_url' => isset($validated['cta_link']) ? $this->formatUrl($validated['cta_link']) : $campaign->cta_url,
            'sender_config_id' => array_key_exists('sender_config_id', $validated) ? $validated['sender_config_id'] : $campaign->sender_config_id,
            'segmentation_mode' => $request->input('segmentation_mode', $campaign->segmentation_mode),
            'status' => $validated['status'] ?? $campaign->status,
            'schedule_type' => $validated['schedule_type'] ?? $campaign->schedule_type,
            'scheduled_at' => array_key_exists('scheduled_at', $validated) ? $validated['scheduled_at'] : $campaign->scheduled_at,
            'schedule_frequency' => array_key_exists('schedule_frequency', $validated) ? $validated['schedule_frequency'] : $campaign->schedule_frequency,
            'schedule_days' => array_key_exists('schedule_days', $validated) ? $validated['schedule_days'] : $campaign->schedule_days,
            'schedule_time' => array_key_exists('schedule_time', $validated) ? $validated['schedule_time'] : $campaign->schedule_time,
            'variable_mappings' => array_key_exists('variable_mappings', $validated) ? $validated['variable_mappings'] : $campaign->variable_mappings,
            'wizard_step' => $validated['wizard_step'] ?? $campaign->wizard_step,
            'recipient_source' => $validated['recipient_source'] ?? $campaign->recipient_source,
        ]);

        if (isset($validated['segments'])) {
            $this->syncSegments($campaign, $validated['segments'], $validated['variants'] ?? []);
        }

        $campaign->load(['variants.filterGroups.filters', 'variants.template', 'template']);
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
            $isSingle = $campaign->segmentation_mode === 'single';
            $incomingIds = collect($segments)->pluck('id')->filter(function ($id) {
                return is_numeric($id);
            })->toArray();

            if (empty($incomingIds)) {
                $campaign->variants()->delete();
            } else {
                $campaign->variants()->whereNotIn('id', $incomingIds)->delete();
            }

            $isFirst = true;
            foreach ($segments as $segment) {
                $isDefault = $segment['isDefault'] ?? false;
                if ($isSingle && $isFirst) {
                    $isDefault = true;
                }
                $isFirst = false;
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
                            'template_id' => $custom['template_id'] ?? null,
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
                            'template_id' => $custom['template_id'] ?? null,
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
                        'template_id' => $custom['template_id'] ?? null,
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
     * Optionally accepts variable_mappings + csv_first_row for dynamic preview.
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'template_id' => 'nullable',
            'body' => 'nullable|string',
            'subject' => 'nullable|string',
            'variables' => 'nullable|array',
            'variable_mappings' => 'nullable|array',
            'csv_first_row' => 'nullable|array',
        ]);

        try {
            $template = null;
            if (!empty($validated['template_id']) && is_numeric($validated['template_id'])) {
                $template = EmailTemplate::where('organization_id', Auth::user()->organization_id ?? 1)
                    ->find($validated['template_id']);
            }

            // Build variables from mappings + first CSV row if provided
            $variables = $validated['variables'] ?? [];
            $mappings = $validated['variable_mappings'] ?? [];
            $csvRow = $validated['csv_first_row'] ?? [];

            if (!empty($mappings) && !empty($csvRow)) {
                foreach ($mappings as $templateVar => $csvHeader) {
                    if ($csvHeader && isset($csvRow[$csvHeader])) {
                        $variables[$templateVar] = $csvRow[$csvHeader];
                    }
                }
            }

            // Also substitute variables inside the body content itself
            $engine = new TemplateVariableEngine();
            $processedBody = $engine->render($validated['body'] ?? '', $variables);
            $processedSubject = isset($validated['subject'])
                ? $engine->render($validated['subject'], $variables)
                : '';

            if ($template) {
                $templateService = new \App\Services\EmailTemplateService();
                $htmlBody = $templateService->mergeWithContent(
                    $template,
                    $processedBody,
                    $variables
                );
            } else {
                $htmlBody = nl2br($processedBody);
            }

            return response()->json([
                'success' => true,
                'htmlBody' => $htmlBody,
                'processedSubject' => $processedSubject,
                'template' => $template ? $template->only(['id', 'template_name', 'subject']) : null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Preview failed: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Extract all dynamic variables from template HTML + campaign body + subject.
     * Returns a deduplicated list of variable names (excluding 'content').
     */
    public function extractVariables(Request $request)
    {
        $validated = $request->validate([
            'template_id' => 'nullable|exists:email_templates,id',
            'body' => 'nullable|string',
            'subject' => 'nullable|string',
        ]);

        $engine = new TemplateVariableEngine();
        $allVars = [];
        $sources = [];

        // 1. Extract from template HTML
        if (!empty($validated['template_id'])) {
            $template = EmailTemplate::where('organization_id', Auth::user()->organization_id ?? 1)
                ->findOrFail($validated['template_id']);
            $templateVars = $engine->extractVariables($template->html_content ?? '');
            foreach ($templateVars as $v) {
                if (!isset($sources[$v])) $sources[$v] = [];
                $sources[$v][] = 'template';
            }
            $allVars = array_merge($allVars, $templateVars);
        }

        // 2. Extract from body content
        if (!empty($validated['body'])) {
            $bodyVars = $engine->extractVariables($validated['body']);
            foreach ($bodyVars as $v) {
                if (!isset($sources[$v])) $sources[$v] = [];
                $sources[$v][] = 'content';
            }
            $allVars = array_merge($allVars, $bodyVars);
        }

        // 3. Extract from subject line
        if (!empty($validated['subject'])) {
            $subjectVars = $engine->extractVariables($validated['subject']);
            foreach ($subjectVars as $v) {
                if (!isset($sources[$v])) $sources[$v] = [];
                $sources[$v][] = 'subject';
            }
            $allVars = array_merge($allVars, $subjectVars);
        }

        // Deduplicate and exclude 'content' (reserved for template content injection)
        $uniqueVars = array_values(array_unique($allVars));
        $uniqueVars = array_filter($uniqueVars, fn($v) => $v !== 'content');

        $result = [];
        foreach ($uniqueVars as $var) {
            $result[] = [
                'name' => $var,
                'sources' => array_unique($sources[$var] ?? []),
            ];
        }

        return response()->json([
            'success' => true,
            'variables' => array_values($result),
        ]);
    }

    public function getOrgRecipients(Request $request)
    {
        $user = Auth::user();
        $orgId = $user->organization_id ?? 1;

        // Fetch insights to get the headers
        $insights = DB::table('campaign_csv_insights')
            ->where('module_type', 1)
            ->where('module_id', $orgId)
            ->get();
        
        $headers = $insights->pluck('field_name')->toArray();
        if (!in_array('email', $headers)) {
            array_unshift($headers, 'email');
        }
        if (!in_array('name', $headers)) {
            $headers[] = 'name';
        }
        if (!in_array('phone', $headers)) {
            $headers[] = 'phone';
        }

        // Get 5 unique sample recipients based on email in a driver-agnostic way
        $subQuery = DB::table('recipients')
            ->select(DB::raw('MIN(id) as id'))
            ->where('module_type', 1)
            ->where('module_id', $orgId)
            ->groupBy('email');

        $sampleRecipients = DB::table('recipients')
            ->whereIn('id', $subQuery)
            ->limit(5)
            ->get();

        // Convert sample recipients to associative array of header => value
        $previewRows = [];
        foreach ($sampleRecipients as $r) {
            $attrs = json_decode($r->attributes, true) ?: [];
            $row = [
                'email' => $r->email,
                'name' => $r->name,
                'phone' => $r->phone,
                'lead_type' => $r->lead_type,
                'city' => $r->city,
                'gender' => $r->gender,
            ];
            // Merge in custom attributes (lowercased keys)
            foreach ($attrs as $key => $val) {
                $row[strtolower($key)] = $val;
            }
            
            // Build the row in the order of headers
            $orderedRow = [];
            foreach ($headers as $h) {
                $orderedRow[$h] = $row[strtolower($h)] ?? null;
            }
            $previewRows[] = $orderedRow;
        }

        // Count unique totals
        $totalRows = DB::table('recipients')
            ->where('module_type', 1)
            ->where('module_id', $orgId)
            ->distinct('email')
            ->count('email');
            
        $validRows = DB::table('recipients')
            ->where('module_type', 1)
            ->where('module_id', $orgId)
            ->where('is_valid', true)
            ->distinct('email')
            ->count('email');

        $invalidRows = $totalRows - $validRows;

        return response()->json([
            'success' => true,
            'headers' => $headers,
            'preview_rows' => $previewRows,
            'total_rows' => $totalRows,
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
        ]);
    }
}
