<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Campaign;
use App\Models\RecipientSegmentAssignment;
use App\Jobs\AssignSegmentsJob;
use App\Jobs\SendCampaignEmailJob;
use App\Models\SendLog;

class DispatchCampaignsCommand extends Command
{
    protected $signature = 'campaigns:dispatch {campaignId?}';
    protected $description = 'Dispatch scheduled campaigns and queue their emails';

    public function handle()
    {
        $campaignId = $this->argument('campaignId');

        if ($campaignId) {
            $campaigns = Campaign::where('id', $campaignId)->get();
        } else {
            $campaigns = Campaign::where('status', 'scheduled')
                ->where(function($q) {
                    $q->whereNull('scheduled_at')
                      ->orWhere('scheduled_at', '<=', now());
                })->get();
        }

        if ($campaigns->isEmpty()) {
            $this->info('No scheduled campaigns to dispatch.');
            return;
        }

        foreach ($campaigns as $campaign) {
            $this->info("Processing campaign: {$campaign->name} (ID: {$campaign->id})");
            $campaign->update(['status' => 'running']);

            // 1. Assign Segments via Job synchronously
            AssignSegmentsJob::dispatchSync($campaign);
            
            // 2. Fetch Assignments
            $assignments = RecipientSegmentAssignment::where('campaign_id', $campaign->id)
                ->with(['recipient', 'variant'])
                ->get();

            if ($assignments->isEmpty()) {
                $this->warn("No recipients assigned for campaign {$campaign->id}. Marking as completed.");
                $campaign->update(['status' => 'completed']);
                continue;
            }

            // 3. Pre-create Send Logs so they appear in Analytics immediately as "queued"
        $logsToInsert = [];
        foreach ($assignments as $assignment) {
            $logsToInsert[] = [
                'campaign_id'   => $campaign->id,
                'recipient_id' => $assignment->recipient_id,
                'variant_id'   => $assignment->variant_id,
                'status'       => 'pending',
                'bounce_type'  => 'none',
                'bounce_count' => 0,
                'clicks_count' => 0,
                'email'        => $assignment->recipient->email ?? null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ];
        }
        foreach (array_chunk($logsToInsert, 500) as $chunk) {
            SendLog::insert($chunk);
        }

            // 4. Queue emails
            foreach ($assignments as $assignment) {
                SendCampaignEmailJob::dispatch($assignment);
            }

            // 4. Mark campaign as running (currently sending via queues)
            $campaign->update(['status' => 'running']);
            
            $this->info("Successfully dispatched campaign {$campaign->id} to " . $assignments->count() . " recipients!");
        }
    }
}
