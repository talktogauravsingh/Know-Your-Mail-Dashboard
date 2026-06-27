<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Plan;
use App\Models\Feature;
use Illuminate\Support\Facades\DB;

class SyncPlansCommand extends Command
{
    protected $signature = 'billing:sync-plans';

    protected $description = 'Synchronize static config plans and features into the database';

    public function handle(): int
    {
        $this->info('Starting plans & features synchronization...');

        $features = config('payments.features', []);
        $plans = config('payments.plans', []);

        // 1. Sync Features
        foreach ($features as $key => $featureData) {
            Feature::updateOrCreate(
                ['key' => $key],
                [
                    'name' => $featureData['name'],
                    'description' => $featureData['description'] ?? null,
                ]
            );
            $this->line("Synced feature: {$key}");
        }

        // 2. Sync Plans
        foreach ($plans as $planKey => $planData) {
            $plan = Plan::updateOrCreate(
                ['key' => $planKey],
                [
                    'name' => $planData['name'],
                    'description' => $planData['description'] ?? null,
                    'price_minor' => $planData['amount_minor'] ?? 0,
                    'currency' => $planData['currency'] ?? 'INR',
                    'billing_interval' => $planData['interval'] ?? 'month',
                    'sort_order' => $planData['sort_order'] ?? 10,
                ]
            );
            $this->line("Synced plan: {$planKey}");

            // Sync features for this plan
            $featureKeys = $planData['feature_keys'] ?? [];
            $syncData = [];

            foreach ($featureKeys as $featureKey => $pivotData) {
                $feature = Feature::where('key', $featureKey)->first();
                if ($feature) {
                    $syncData[$feature->id] = [
                        'is_enabled' => $pivotData['is_enabled'] ?? 1,
                        'limit_value' => $pivotData['limit_value'] ?? null,
                    ];
                }
            }

            $plan->features()->sync($syncData);
        }

        $this->info('Synchronization completed successfully.');
        return self::SUCCESS;
    }
}
