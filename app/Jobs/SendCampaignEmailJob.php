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
use App\Services\EmailTemplateService;
use App\Services\TemplateVariableEngine;
use App\Mail\BulkMail;

class SendCampaignEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $assignment;

    /**
     * Maximum number of attempts before the job is failed
     */
    public $tries = 3;

    /**
     * Number of seconds to wait before retrying the job
     */
    public $backoff = [10, 60, 300];  // 10s, 60s, 5min

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
        
        // If config found, set dynamically. Otherwise it falls back to organization SmtpCredential
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
            // Re-evaluate using our generated SmtpCredential for the organization
            $credential = \App\Models\SmtpCredential::where('organization_id', $campaign->organization_id)
                ->where('is_active', true)
                ->whereNotNull('encrypted_password')
                ->first();

            if ($credential) {
                try {
                    $plainPassword = \Illuminate\Support\Facades\Crypt::decryptString($credential->encrypted_password);
                    $fromDomain = $credential->domain?->domain;
                    
                    if (!$fromDomain) {
                        // Fall back to first verified domain under organization
                        $verifiedDomain = \App\Models\SenderDomain::where('organization_id', $campaign->organization_id)
                            ->where('status', 'verified')
                            ->first();
                        $fromDomain = $verifiedDomain?->domain;
                    }

                    if ($fromDomain) {
                        config([
                            'mail.default' => 'smtp',
                            'mail.mailers.smtp.transport' => 'smtp',
                            'mail.mailers.smtp.host' => '127.0.0.1',
                            'mail.mailers.smtp.port' => 25,
                            'mail.mailers.smtp.encryption' => null,
                            'mail.mailers.smtp.username' => $credential->username,
                            'mail.mailers.smtp.password' => $plainPassword,
                            'mail.from' => [
                                'address' => 'campaign@' . $fromDomain,
                                'name' => $campaign->name ?? 'KYM Campaign',
                            ],
                        ]);
                        app()->forgetInstance('mail.manager');
                        app()->forgetInstance('mailer');
                    } else {
                        Log::warning("No verified domain found for SmtpCredential in Campaign {$campaign->id}.");
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to decrypt SMTP Credential password for Campaign {$campaign->id}: " . $e->getMessage());
                }
            } else {
                Log::warning("SMTP Config and SmtpCredential not found for Campaign {$campaign->id}, using default.");
            }
        }

        $sendLog = SendLog::where('campaign_id', $campaign->id)
            ->where('recipient_id', $recipient->id)
            ->first();

        if (!$sendLog) {
            $sendLog = SendLog::create([
                'campaign_id' => $campaign->id,
                'recipient_id' => $recipient->id,
                'variant_id' => $variant->id,
                'email' => $recipient->email,
                'status' => 'pending',
                'bounce_type' => 'none',
                'bounce_count' => 0,
                'clicks_count' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        try {
            // Prepare variables for substitution
            // Start with core fields that are always available
            $variables = [
                'name' => $recipient->name ?? '',
                'email' => $recipient->email,
            ];

            // Apply dynamic variable mappings from campaign settings
            // Maps template variables to CSV column headers stored in recipient attributes
            $mappings = $campaign->variable_mappings ?? [];
            $attributes = $recipient->attributes ?? [];
            foreach ($mappings as $templateVar => $csvHeader) {
                if ($csvHeader && isset($attributes[$csvHeader])) {
                    $variables[$templateVar] = $attributes[$csvHeader];
                }
            }

            // Determine the email subject (variant subject always takes precedence)
            $subject = $variant->subject;
            $engine = new TemplateVariableEngine();
            $subject = $engine->render($subject, $variables);

            // Prepare HTML body
            $trackingBase = rtrim(env('TRACKING_BASE_URL', config('app.url')), '/');
            $htmlBody = '';

            // Resolve the template for this variant: use variant's template_id first, falling back to campaign's template_id
            $templateId = $variant->template_id ?: $campaign->template_id;
            $template = $templateId ? \App\Models\EmailTemplate::find($templateId) : null;

            // If template exists, use template merging
            if ($template) {
                $templateService = new EmailTemplateService();
                
                // Prepare the variant body (with variable substitution)
                $body = $engine->render($variant->body, $variables);
                
                // Merge campaign body into template's {{content}} block
                $htmlBody = $templateService->mergeWithContent($template, $body, $variables);
            } else {
                // Fallback: no template, use raw body from variant
                $body = $engine->render($variant->body, $variables);
                $htmlBody = nl2br($body);
            }

            // Convert plain text URLs to anchor tags (if not already wrapped in an href or src)
            $htmlBody = preg_replace_callback(
                '/(?<!href=["\'])(?<!src=["\'])\b(https?:\/\/[^\s<>\]]+)/i',
                function($matches) {
                    $url = rtrim($matches[1], '.,;:!?)"\'>');
                    return '<a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($url) . '</a>';
                },
                $htmlBody
            );

            // Rewrite all <a href="..."> links to route through click tracking
            $htmlBody = preg_replace_callback(
                '/href="([^"]+)"/i',
                function($matches) use ($trackingBase, $sendLog) {
                    $url = htmlspecialchars_decode($matches[1]);
                    if (str_contains($url, '/api/track/')) {
                        return $matches[0]; // already tracked
                    }
                    return 'href="' . $trackingBase . '/api/track/click/' . $sendLog->id . '?url=' . urlencode($url) . '"';
                },
                $htmlBody
            );

            // Add tracking pixel to the HTML body
            $trackingUrl = "{$trackingBase}/api/track/open/{$sendLog->id}";
            $trackingPixel = "<img src='{$trackingUrl}' width='1' height='1' style='display:none;' />";
            
            // Add CTA tracking if there is one
            $ctaLink = $variant->cta_url;
            if ($ctaLink) {
                $trackedCta = "{$trackingBase}/api/track/click/{$sendLog->id}?url=" . urlencode($ctaLink);
                // Append CTA link if not already in body
                if (!str_contains($htmlBody, $ctaLink)) {
                    $htmlBody .= "<br><br><a href='{$trackedCta}'>Click Here</a>";
                }
            }

            // Append tracking pixel at the end
            $htmlBody .= $trackingPixel;

            // Send email using the new BulkMail mailable
            Mail::to($recipient->email)->send(new BulkMail($subject, $htmlBody));

            $sendLog->update([
                'status' => 'delivered',
                'sent_at' => now(),
                'delivered_at' => now(),
            ]);

            Log::info("Sent email to {$recipient->email} for campaign {$campaign->id} using Variant: {$variant->name}");

            // Auto-complete campaign if this was the last pending email
            $hasPending = SendLog::where('campaign_id', $campaign->id)
                ->where('status', 'pending')
                ->exists();
            if (!$hasPending) {
                $campaign->update(['status' => 'completed']);
                Log::info("Campaign {$campaign->id} marked as completed after successful dispatch.");
            }

        } catch (\Exception $e) {
            Log::error("Failed to send email to {$recipient->email}: " . $e->getMessage());
            
            // Release the job back to the queue for retry if attempts remaining
            if ($this->attempts() < $this->tries) {
                if ($sendLog) {
                    $sendLog->update([
                        'status' => 'pending', // keep as pending to allow retrying
                        'response' => substr($e->getMessage(), 0, 255),
                    ]);
                }
                $this->release($this->backoff[$this->attempts() - 1] ?? 300);
            } else {
                // Job exceeded max attempts, fail it permanently
                if ($sendLog) {
                    $sendLog->update([
                        'status' => 'failed',
                        'response' => substr($e->getMessage(), 0, 255),
                    ]);
                }
                
                // Auto-complete campaign if this was the last pending email
                $hasPending = SendLog::where('campaign_id', $campaign->id)
                    ->where('status', 'pending')
                    ->exists();
                if (!$hasPending) {
                    $campaign->update(['status' => 'completed']);
                    Log::info("Campaign {$campaign->id} marked as completed after dispatch failure limit.");
                }
                
                $this->fail($e);
            }
        }
    }
}
