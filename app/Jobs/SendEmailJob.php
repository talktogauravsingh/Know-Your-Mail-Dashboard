<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\SendLog;
use App\Models\IpAddress;
use App\Models\Suppression;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;
use App\Mail\BulkMail;
use Illuminate\Support\Facades\Log;
use App\Services\IpWarmupService;

class SendEmailJob implements ShouldQueue
{
    use Queueable;

    protected $recipient;
    protected $ip;

    public $tries = 2; // max retries

    public function __construct($recipient, $ip)
    {
        $this->recipient = $recipient;
        $this->ip = $ip;
    }

    /**
     * Execute the job.
     */
    public function handle()
    {
        try {

            $key = "rate_limit_ip_" . $this->ip->id;
            $count = Redis::incr($key);
            Log::info('[SendEmailJob] Job started', [
                'ip' => $this->ip->ip,
                'email' => $this->recipient,
            ]);
            // expire every 60 seconds
            if ($count == 1) {
                Redis::expire($key, 60);
            }

            Log::debug('[SendEmailJob] Rate limit check', [
                'key'         => $key,
                'count'       => $count,
                'limit'       => 30,
                'window_secs' => 60,
            ]);

            // if ($count > 30) {
            //     $this->release(10);
            //     return;
            // }
            $suppressed = Suppression::where('email', $this->recipient->email)
                ->where('organization_id', 1)
                ->exists();

            if ($suppressed) {
                return; // skip sending
            }


            $warmupService = app(IpWarmupService::class);

            $todayCount = \App\Models\SendLog::where('ip_used', $this->ip->ip)
                ->whereDate('created_at', now())
                ->count();

            $limit = $warmupService->getDailyLimit($this->ip);

            if ($todayCount >= $limit) {
                $this->release(60); // retry later
                return;
            }
            config([
                'mail.mailers.smtp.host' => $this->ip->smtp_host,
                'mail.mailers.smtp.username' => $this->ip->smtp_username,
                'mail.mailers.smtp.password' => $this->ip->smtp_password,
                'mail.mailers.smtp.port' => $this->ip->smtp_port,
            ]);

            Mail::to($this->recipient->email)->send(new BulkMail("The future of email delivery starts here."));
            Log::info('[SendEmailJob] Email sent successfully',[]);

            // success log
            SendLog::create([
                'campaign_id' => $this->recipient->campaign_id,
                'email' => $this->recipient->email,
                'ip_used' => $this->ip->ip,
                'status' => 'success',
                'response' => 'sent'
            ]);

            $this->ip->increment('success_count');
            $this->ip->increment('send_count');

        } catch (\Exception $e) {

        Log::error('Email failed 1', [
            'error' => $e->getMessage(),
            'ip' => $this->ip ?? null
        ]);

            $message = $e->getMessage();

            $isHardBounce = str_contains($message, '550') || 
                            str_contains($message, 'User unknown');

            if ($isHardBounce) {
                Suppression::create([
                    'organization_id' => 1,
                    'email' => $this->recipient->email,
                    'reason' => 'hard_bounce'
                ]);
            }else{
                Suppression::create([
                    'organization_id' => 1,
                    'email' => $this->recipient->email,
                    'reason' => 'bounce'
                ]);
            }

            
            SendLog::create([
                'campaign_id' => $this->recipient->campaign_id,
                'email' => $this->recipient->email,
                'ip_used' => $this->ip->ip,
                'status' => 'failed',
                'response' => $e->getMessage()
            ]);

            $this->ip->increment('bounce_count');
            if ($this->ip->bounce_count > 50) {
                $this->ip->update(['is_active' => false]);
            }

            throw $e;
        }
    }
}
