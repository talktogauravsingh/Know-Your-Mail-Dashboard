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

        $insights = DB::table('campaign_csv_insights')
            ->where('campaign_id', $campaign->id)
            ->get();

        if ($insights->isEmpty()) {
            Log::info("No campaign-specific insights found, checking organization-level insights for org {$campaign->organization_id}");
            $insights = DB::table('campaign_csv_insights')
                ->where('organization_id', $campaign->organization_id)
                ->whereNull('campaign_id')
                ->get();
        }

        return response()->json([
            'success' => true,
            'insights' => $insights->map(function($item) {
                return [
                    'field_name' => $item->field_name,
                    'unique_count' => $item->unique_count,
                    'distribution' => json_decode($item->distribution),
                    'is_recommended' => (bool)$item->is_recommended,
                    'field_type' => $item->field_type,
                ];
            })
        ]);
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
        ]);

        $query = Recipient::where('organization_id', $campaign->organization_id);

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

        $column = "attributes->'$.{$field}'";

        switch ($op) {
            case '=':
                $query->whereRaw("JSON_UNQUOTE({$column}) = ?", [$value]);
                break;
            case '!=':
                $query->whereRaw("JSON_UNQUOTE({$column}) != ?", [$value]);
                break;
            case 'in':
                $values = is_array($value) ? $value : array_map('trim', explode(',', $value));
                $query->whereRaw("JSON_UNQUOTE({$column}) IN (" . implode(',', array_fill(0, count($values), '?')) . ")", $values);
                break;
            case 'not_in':
                $values = is_array($value) ? $value : array_map('trim', explode(',', $value));
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
