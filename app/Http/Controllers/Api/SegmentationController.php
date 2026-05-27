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
        abort_unless(request()->user()?->organization_id === $campaign->organization_id, 404);

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
        $organizationId = $request->user()->organization_id;

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
    public function validateCount(Request $request, $campaignId = null)
    {
        $request->validate([
            'groups' => 'required|array',
            'groups.*.filters' => 'required|array',
            'groups.*.filters.*.field_name' => ['required', 'string', 'regex:/^[A-Za-z0-9_]+$/'],
            'groups.*.filters.*.operator' => 'required|string',
            'groups.*.filters.*.field_value' => 'required',
            'module_type' => 'nullable|integer|in:1,2',
            'module_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $campaign = $campaignId
            ? Campaign::where('organization_id', $user->organization_id)->findOrFail($campaignId)
            : null;
        $organizationId = $campaign ? $campaign->organization_id : $user->organization_id;

        Log::info("Validating segment count for organization {$organizationId}", [
            'campaign_id' => $campaignId,
            'module_type' => $request->module_type,
            'module_id' => $request->module_id
        ]);

        $query = Recipient::where('organization_id', $organizationId);

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
        $field = strtolower(trim($filter['field_name']));
        $value = $filter['field_value'];
        $op = $filter['operator'];

        // Normalize value to lowercase since import process lowercases everything
        if (is_string($value)) {
            $value = strtolower(trim($value));
        }

        // Handle top-level columns vs JSON attributes
        // These are actual columns in the recipients table
        $topLevelColumns = ['email', 'name', 'phone', 'lead_type'];
        
        if (in_array($field, $topLevelColumns)) {
            $column = $field;
            $useJson = false;
        } else {
            $column = "attributes->>'{$field}'";
            $useJson = true;
        }

        switch ($op) {
            case '=':
                if ($useJson) {
                    $query->whereRaw("{$column} = ?", [$value]);
                } else {
                    $query->where($column, $value);
                }
                break;
            case '!=':
                if ($useJson) {
                    $query->whereRaw("{$column} != ?", [$value]);
                } else {
                    $query->where($column, '!=', $value);
                }
                break;
            case 'in':
                $values = is_array($value) ? $value : array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                if ($useJson) {
                    $placeholders = implode(',', array_fill(0, count($values), '?'));
                    $query->whereRaw("{$column} IN ({$placeholders})", $values);
                } else {
                    $query->whereIn($column, $values);
                }
                break;
            case 'not_in':
                $values = is_array($value) ? $value : array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                if ($useJson) {
                    $placeholders = implode(',', array_fill(0, count($values), '?'));
                    $query->whereRaw("{$column} NOT IN ({$placeholders})", $values);
                } else {
                    $query->whereNotIn($column, $values);
                }
                break;
            case 'contains':
                if ($useJson) {
                    $query->whereRaw("{$column} LIKE ?", ["%{$value}%"]);
                } else {
                    $query->where($column, 'LIKE', "%{$value}%");
                }
                break;
            case 'starts_with':
                if ($useJson) {
                    $query->whereRaw("{$column} LIKE ?", ["{$value}%"]);
                } else {
                    $query->where($column, 'LIKE', "{$value}%");
                }
                break;
        }
    }
}
