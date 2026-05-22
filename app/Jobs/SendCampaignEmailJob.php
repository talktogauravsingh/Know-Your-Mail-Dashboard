<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\RecipientSegmentAssignment;
use App\Models\SmtpConfiguration;
use App\Models\SendLog;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendCampaignEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $assignment;

    public function __construct(RecipientSegmentAssignment $assignment)
    {
        $this->assignment = $assignment;
    }

    public function handle()
    {

        $assignment = $this->assignment;
        $recipient = $assignment->recipient;
        $variant = $assignment->variant;
        $campaign = $assignment->campaign;

        if (!$recipient || !$variant || !$campaign) {
            return;
        }

        // Fetch the active SMTP configuration for this organization
        $config = SmtpConfiguration::where('organization_id', $campaign->organization_id)
            ->where('status', 1)
            ->first();
        
        // If config found, set dynamically. Otherwise it falls back to .env default
        if ($config) {

            config([
                'mail.default' => 'smtp',

                'mail.mailers.smtp.transport' => 'smtp',
                'mail.mailers.smtp.host' => $config->host,
                'mail.mailers.smtp.port' => $config->port,
                'mail.mailers.smtp.encryption' => $config->encryption !== 'none'
                    ? $config->encryption
                    : null,
                'mail.mailers.smtp.username' => $config->username,
                'mail.mailers.smtp.password' => trim($config->password),

                'mail.from' => [
                    'address' => $config->from_address,
                    'name' => $config->from_name,
                ],
            ]);

            app()->forgetInstance('mail.manager');
            app()->forgetInstance('mailer');
        } else {
            Log::warning("SMTP Config not found for Campaign {$campaign->id}, using default.");
        }

        $sendLog = SendLog::where('campaign_id', $campaign->id)
            ->where('recipient_id', $recipient->id)
            ->first();

        if (!$sendLog) {
            $sendLog = SendLog::create([
                'campaign_id' => $campaign->id,
                'recipient_id' => $recipient->id,
                'variant_id' => $variant->id,
                'status' => 'pending',
                'bounce_type' => 'none',
                'bounce_count' => 0,
                'clicks_count' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        try {
            // Replace variables in subject and body
            $subject = str_replace('{{name}}', $recipient->name ?? '', $variant->subject);
            $body = str_replace('{{name}}', $recipient->name ?? '', $variant->body);

            // Add tracking pixel
            $trackingUrl = url("/api/track/open/{$sendLog->id}");
            $trackingPixel = "<img src='{$trackingUrl}' width='1' height='1' style='display:none;' />";
            
            // Add CTA link if there is one
            $ctaLink = $variant->cta_url;
            if ($ctaLink) {
                // In production, this would go through a proxy like:
                // $trackedCta = url("/api/track/click/{$sendLog->id}?url=" . urlencode($ctaLink));
                // But for now we just inject the raw link
                $body .= "<br><br><a href='{$ctaLink}'>Click Here</a>";
            }

            // In production, body may be markdown or HTML. Assuming HTML for MVP.
            $htmlBody = nl2br($body) . $trackingPixel;

            Mail::html($htmlBody, function ($message) use ($recipient, $subject) {
                $message->to($recipient->email)
                        ->subject($subject);
            });

            $sendLog->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            Log::info("Sent email to {$recipient->email} for campaign {$campaign->id} using Variant: {$variant->name}");

        } catch (\Exception $e) {
            Log::error("Failed to send email to {$recipient->email}: " . $e->getMessage());
            $sendLog->update([
                'status' => 'failed',
                'response' => substr($e->getMessage(), 0, 255),
            ]);
        }
    }
}
