<?php

namespace App\Jobs;

use App\Models\SendLog;
use App\Models\TriggerAutomation;
use App\Models\TriggerAutomationLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class EvaluateTriggerAutomationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $sendLog;
    protected $event;
    protected $clickUrl;

    /**
     * Create a new job instance.
     */
    public function __construct(SendLog $sendLog, string $event, ?string $clickUrl = null)
    {
        $this->sendLog = $sendLog;
        $this->event = $event;
        $this->clickUrl = $clickUrl;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $sendLog = $this->sendLog;
            $event = $this->event;
            $clickUrl = $this->clickUrl;

            if (!$sendLog || !$sendLog->campaign) {
                return;
            }

            $organizationId = $sendLog->campaign->organization_id;

            // Fetch active automations for this campaign
            $automations = TriggerAutomation::where('organization_id', $organizationId)
                ->where('trigger_campaign_id', $sendLog->campaign_id)
                ->where('status', 'active')
                ->get();

            foreach ($automations as $automation) {
                // 1. Check segment/variant targeting
                $variantIds = $automation->trigger_variant_ids;
                if (is_array($variantIds) && !empty($variantIds)) {
                    if (!in_array($sendLog->variant_id, $variantIds)) {
                        continue; // Targeted variants configured, but this sendLog variant doesn't match
                    }
                }

                // Resolve configuration for this variant / recipient
                $variantId = $sendLog->variant_id;
                $mappings = $automation->action_variable_mappings ?? [];
                
                $resolvedEvent = $automation->trigger_event;
                $resolvedClickUrl = $automation->trigger_click_url;
                $resolvedDelayHours = $automation->delay_hours ?? 0;
                $resolvedDelayMinutes = $automation->delay_minutes ?? 0;

                $segConfig = null;
                if (isset($mappings['global_mappings']) || isset($mappings['segment_configs'])) {
                    if ($variantId !== null && isset($mappings['segment_configs'])) {
                        if (isset($mappings['segment_configs'][$variantId])) {
                            $segConfig = $mappings['segment_configs'][$variantId];
                        } elseif (isset($mappings['segment_configs'][(string)$variantId])) {
                            $segConfig = $mappings['segment_configs'][(string)$variantId];
                        } elseif (isset($mappings['segment_configs'][(int)$variantId])) {
                            $segConfig = $mappings['segment_configs'][(int)$variantId];
                        }
                    }
                }

                if ($segConfig) {
                    if (isset($segConfig['triggerEvent'])) {
                        $resolvedEvent = $segConfig['triggerEvent'];
                    }
                    if (isset($segConfig['triggerClickUrl'])) {
                        $resolvedClickUrl = $segConfig['triggerClickUrl'];
                    }
                    if (isset($segConfig['delayHours'])) {
                        $resolvedDelayHours = (int)$segConfig['delayHours'];
                    }
                    if (isset($segConfig['delayMinutes'])) {
                        $resolvedDelayMinutes = (int)$segConfig['delayMinutes'];
                    }
                }

                // Match trigger event
                if ($resolvedEvent !== $event) {
                    continue;
                }

                // 2. Check Click URL filter if it's a click event
                if ($event === 'click' && !empty($resolvedClickUrl)) {
                    $configuredUrl = trim($resolvedClickUrl);
                    $actualUrl = trim($clickUrl ?? '');
                    
                    // Simple match checking (exact or normalized)
                    if (strcasecmp($configuredUrl, $actualUrl) !== 0) {
                        // Let's also check if query string stripped matches
                        $configuredStripped = strtok($configuredUrl, '?');
                        $actualStripped = strtok($actualUrl, '?');
                        if (strcasecmp($configuredStripped, $actualStripped) !== 0) {
                            continue;
                        }
                    }
                }

                // 3. Enforce capping constraints: Max 1 execution per automation per recipient
                $alreadyTriggered = TriggerAutomationLog::where('automation_id', $automation->id)
                    ->where('recipient_id', $sendLog->recipient_id)
                    ->exists();

                if ($alreadyTriggered) {
                    continue; // Skip already triggered
                }

                // 4. Create trigger audit log
                $log = TriggerAutomationLog::create([
                    'automation_id' => $automation->id,
                    'recipient_id' => $sendLog->recipient_id,
                    'send_log_id' => $sendLog->id,
                    'status' => 'pending',
                    'triggered_at' => now(),
                ]);

                // 5. Dispatch actual send job with customizable delay buffer
                $delaySeconds = ($resolvedDelayHours * 3600) + ($resolvedDelayMinutes * 60);
                if ($delaySeconds > 0) {
                    SendTriggerAutomationEmailJob::dispatch($automation, $sendLog->recipient, $log)
                        ->delay(now()->addSeconds($delaySeconds));
                } else {
                    SendTriggerAutomationEmailJob::dispatch($automation, $sendLog->recipient, $log);
                }
            }
        } catch (\Exception $e) {
            Log::error('EvaluateTriggerAutomationJob failed: ' . $e->getMessage());
        }
    }
}
