<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignVariant;
use App\Models\Recipient;
use App\Models\RecipientSegmentAssignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssignSegmentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $campaign;

    public function __construct(Campaign $campaign)
    {
        $this->campaign = $campaign;
    }

    public function handle()
    {
        if ($this->campaign->segmentation_mode !== 'segmented') {
            Log::info("Campaign {$this->campaign->id} is in single mode. Proceeding with default assignment.");
        }

        // 1. Get all variants ordered by priority (descending so high priority overwrites low priority)
        // Wait, if we want high priority (low number) to win, we should process:
        // Default -> Low Priority (High Number) -> High Priority (Low Number)
        $variants = $this->campaign->variants()
            ->with(['filterGroups.filters'])
            ->orderBy('is_default', 'desc') // Default (1) first, then non-defaults (0)
            ->orderBy('priority', 'desc') // Higher number (lower priority) first
            ->get();

        $defaultVariant = $variants->firstWhere('is_default', true);
        
        Log::info("Starting segment assignment for campaign {$this->campaign->id}");

        // 2. Clear previous assignments
        RecipientSegmentAssignment::where('campaign_id', $this->campaign->id)->delete();

        // 3. Process each variant
        foreach ($variants as $variant) {
            $this->assignRecipientsToVariant($variant);
        }

        Log::info("Completed segment assignment for campaign {$this->campaign->id}");
    }

    protected function assignRecipientsToVariant(CampaignVariant $variant)
    {
        $hasCampaignRecipients = Recipient::where('module_type', 2)->where('module_id', $this->campaign->id)->exists();
        if ($hasCampaignRecipients) {
            $query = Recipient::where('module_type', 2)->where('module_id', $this->campaign->id);
        } else {
            $query = Recipient::where('module_type', 1)->where('module_id', $this->campaign->organization_id);
        }

        $filterGroups = $variant->filterGroups;
        if (!$filterGroups->isEmpty()) {
            $query->where(function ($q) use ($filterGroups) {
                foreach ($filterGroups as $group) {
                    $q->orWhere(function ($subQ) use ($group) {
                        foreach ($group->filters as $filter) {
                            $this->applyFilter($subQ, $filter);
                        }
                    });
                }
            });
        } elseif (!$variant->is_default) {
            // Non-default variant with no filters shouldn't match anyone
            return;
        }

        // Perform batch insert/update (ON DUPLICATE KEY UPDATE variant_id)
        // For simplicity and to handle large volumes, we use INSERT INTO ... SELECT
        $campaignId = $this->campaign->id;
        $variantId = $variant->id;
        $now = now();

        $sql = "
            INSERT INTO recipient_segment_assignments (campaign_id, recipient_id, variant_id, created_at, updated_at)
            " . $query->selectRaw('?, id, ?, ?, ?', [$campaignId, $variantId, $now, $now])->toSql() . "
            ON CONFLICT (campaign_id, recipient_id) DO UPDATE SET variant_id = EXCLUDED.variant_id, updated_at = EXCLUDED.updated_at
        ";

        DB::statement($sql, $query->getBindings());
    }

    protected function applyFilter($query, $filter)
    {
        $field = strtolower(trim($filter->field_name));
        if (!preg_match('/^[A-Za-z0-9_]+$/', $field)) {
            return;
        }
        $value = $filter->field_value;
        $op = $filter->operator;

        // Lowercase for comparison to match imported data
        if (is_string($value)) {
            $value = strtolower(trim($value));
        }

        // Attributes is a JSON column. Use Postgres ->> operator to extract text
        $column = "attributes->>'{$field}'";

        switch ($op) {
            case '=':
                $query->whereRaw("{$column} = ?", [$value]);
                break;
            case '!=':
                $query->whereRaw("{$column} != ?", [$value]);
                break;
            case 'in':
                $values = array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $query->whereRaw("{$column} IN ({$placeholders})", $values);
                break;
            case 'not_in':
                $values = array_map(fn($v) => strtolower(trim($v)), explode(',', $value));
                $placeholders = implode(',', array_fill(0, count($values), '?'));
                $query->whereRaw("{$column} NOT IN ({$placeholders})", $values);
                break;
            case 'contains':
                $query->whereRaw("{$column} LIKE ?", ["%{$value}%"]);
                break;
            case 'starts_with':
                $query->whereRaw("{$column} LIKE ?", ["{$value}%"]);
                break;
        }
    }
}
