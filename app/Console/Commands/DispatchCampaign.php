<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use App\Models\Recipient;
use App\Services\IpRotationService;
use App\Jobs\SendEmailJob;
use Illuminate\Support\Facades\Log;

#[Signature('app:dispatch-campaign')]
#[Description('Command description')]
class DispatchCampaign extends Command
{
    /**
     * Execute the console command.
     */

    public function handle()
    {
        $campaignId = 1;

        $recipients = Recipient::where('campaign_id', $campaignId)
            ->where('is_valid', true)
            ->get();

        $ipService = new IpRotationService();


        try{
                    foreach ($recipients as $recipient) {
            $ip = $ipService->getIpForEmail($recipient->email);
            Log::info('selected ip',[
                'ip' => json_encode($ip)
            ]);

            dispatch(new SendEmailJob($recipient, $ip))
                ->onQueue('ip_' . $ip->id);
        }

        $this->info("Campaign dispatched");
        } catch (\Exception $e) {

        Log::error('Email failed', [
            'error' => $e->getMessage(),
            'ip' => $this->ip ?? null
        ]);

        // Optional: update DB (bounce_count etc)
        throw $e; // rethrow so retry happens
    }


    }
}
