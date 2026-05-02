<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\Recipient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SegmentationController extends Controller
{
    /**
     * Get insights for a campaign's CSV upload.
     */
    public function getInsights(Campaign $campaign)
    {
        Log::info("Fetching insights for campaign {$campaign->id}");

        // Get campaign-specific insights (module_type 2)
        $campaignInsights = DB::table('campaign_csv_insights')
            ->where('module_type', 2)
            ->where('module_id', $campaign->id)
            ->get();

        // Get organization-level insights (module_type 1)
        $orgInsights = DB::table('campaign_csv_insights')
            ->where('module_type', 1)
            ->where('module_id', $campaign->organization_id)
            ->get();

        // Merge them, campaign insights take priority
        $merged = $campaignInsights->keyBy('field_name')
            ->union($orgInsights->keyBy('field_name'))
            ->values();

        return response()->json([
            'success' => true,
            'insights' => $this->formatInsights($merged)
        ]);
    }

    /**
     * Get insights for the entire organization.
     */
    public function getOrgInsights(Request $request)
    {
        $organizationId = $request->user() ? $request->user()->organization_id : 1;

        $insights = DB::table('campaign_csv_insights')
            ->where('module_type', 1)
            ->where('module_id', $organizationId)
            ->get();

        return response()->json([
            'success' => true,
            'insights' => $this->formatInsights($insights)
        ]);
    }

    protected function formatInsights($insights)
    {
        return $insights->map(function($item) {
            return [
                'field_name' => $item->field_name,
                'unique_count' => $item->unique_count,
                'distribution' => json_decode($item->distribution),
                'is_recommended' => (bool)$item->is_recommended,
                'field_type' => $item->field_type,
            ];
        });
    }

    /**
     * Validate the count of recipients for a set of filters.
     */
    public function validateCount(Request $request, Campaign $campaign)
    {
        $request->validate([
            'groups' => 'required|array',
            'groups.*.filters' => 'required|array',
            'groups.*.filters.*.field_name' => 'required|string',
            'groups.*.filters.*.operator' => 'required|string',
            'groups.*.filters.*.field_value' => 'required',
            'module_type' => 'nullable|integer|in:1,2',
            'module_id' => 'nullable|integer',
        ]);

        $query = Recipient::where('organization_id', $campaign->organization_id);

        // Filter by module if specified
        if ($request->has('module_type') && $request->has('module_id')) {
            $query->where('module_type', $request->module_type)
                  ->where('module_id', $request->module_id);
        }

        $query->where(function ($q) use ($request) {
            foreach ($request->groups as $group) {
                $q->orWhere(function ($subQ) use ($group) {
                    foreach ($group['filters'] as $filter) {
                        $this->applyFilter($subQ, $filter);
                    }
                });
            }
        });

        $count = $query->count();

        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }

    protected function applyFilter($query, $filter)
    {
        $field = $filter['field_name'];
        $value = $filter['field_value'];
        $op = $filter['operator'];

        // Normalize value to lowercase since import process lowercases everything
        if (is_string($value)) {
            $value = strtolower(trim($value));
        }

        $column = "attributes->'$.{$field}'";

        switch ($op) {
            case '=':
                $query->whereRaw("JSON_UNQUOTE({$column}) = ?", [$value]);
                break;
            case '!=':
                $query->whereRaw("JSON_UNQUOTE({$column}) != ?", [$value]);
                break;
            case 'in':
                $values = is_array($value) ? $value : array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                $query->whereRaw("JSON_UNQUOTE({$column}) IN (" . implode(',', array_fill(0, count($values), '?')) . ")", $values);
                break;
            case 'not_in':
                $values = is_array($value) ? $value : array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                $query->whereRaw("JSON_UNQUOTE({$column}) NOT IN (" . implode(',', array_fill(0, count($values), '?')) . ")", $values);
                break;
            case 'contains':
                $query->whereRaw("JSON_UNQUOTE({$column}) LIKE ?", ["%{$value}%"]);
                break;
            case 'starts_with':
                $query->whereRaw("JSON_UNQUOTE({$column}) LIKE ?", ["{$value}%"]);
                break;
        }
    }
}
