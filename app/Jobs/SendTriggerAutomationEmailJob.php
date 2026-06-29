<?php

namespace App\Jobs;

use App\Models\Recipient;
use App\Models\TriggerAutomation;
use App\Models\TriggerAutomationLog;
use App\Models\SmtpConfiguration;
use App\Mail\BulkMail;
use App\Services\EmailTemplateService;
use App\Services\TemplateVariableEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendTriggerAutomationEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $automation;
    protected $recipient;
    protected $log;

    public $tries = 3;
    public $backoff = [10, 60, 300];

    /**
     * Create a new job instance.
     */
    public function __construct(TriggerAutomation $automation, Recipient $recipient, TriggerAutomationLog $log)
    {
        $this->automation = $automation;
        $this->recipient = $recipient;
        $this->log = $log;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $automation = $this->automation;
        $recipient = $this->recipient;
        $logModel = $this->log;

        if (!$automation || !$recipient || !$logModel) {
            return;
        }

        // 1. Dynamic SMTP config setup
        $config = SmtpConfiguration::where('organization_id', $automation->organization_id)
            ->where('status', 1)
            ->first();

        if ($config) {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.transport' => 'smtp',
                'mail.mailers.smtp.host' => $config->host,
                'mail.mailers.smtp.port' => $config->port,
                'mail.mailers.smtp.encryption' => $config->encryption !== 'none' ? $config->encryption : null,
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
            Log::warning("SMTP Config not found for Trigger Automation {$automation->id}, using system default.");
        }

        try {
            $variantId = null;
            if ($logModel->sendLog) {
                $variantId = $logModel->sendLog->variant_id;
            }

            $mappings = $automation->action_variable_mappings ?? [];
            
            $resolvedTemplateId = $automation->action_template_id;
            $resolvedSubject = $automation->action_subject;
            $resolvedMappings = $mappings;

            $segConfig = null;
            if (isset($mappings['global_mappings']) || isset($mappings['segment_configs'])) {
                $resolvedMappings = $mappings['global_mappings'] ?? [];
                
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
                if (isset($segConfig['selectedTemplateId'])) {
                    $resolvedTemplateId = $segConfig['selectedTemplateId'];
                }
                if (isset($segConfig['actionSubject'])) {
                    $resolvedSubject = $segConfig['actionSubject'];
                }
                if (isset($segConfig['variableMappings'])) {
                    $resolvedMappings = $segConfig['variableMappings'];
                }
            }

            // 2. Prepare variables for substitution
            $variables = [
                'name' => $recipient->name ?? '',
                'email' => $recipient->email,
            ];

            // Load variable mappings configured by the user
            $attributes = $recipient->attributes ?? [];
            foreach ($resolvedMappings as $templateVar => $csvHeader) {
                if ($csvHeader && isset($attributes[$csvHeader])) {
                    $variables[$templateVar] = $attributes[$csvHeader];
                }
            }

            // 3. Compile Subject line
            $subject = $resolvedSubject;
            $engine = new TemplateVariableEngine();
            $subject = $engine->render($subject, $variables);

            // 4. Compile Body
            $htmlBody = '';
            $template = null;
            if ($resolvedTemplateId) {
                if ($resolvedTemplateId == $automation->action_template_id) {
                    $template = $automation->template;
                } else {
                    $template = \App\Models\EmailTemplate::find($resolvedTemplateId);
                }
            }

            if ($template) {
                $templateService = new EmailTemplateService();
                $htmlBody = $templateService->render($template, $variables);
            } else {
                $htmlBody = "Hello " . e($recipient->name) . ",<br><br>Thank you for your interaction.";
            }

            // 5. Send Email
            Mail::to($recipient->email)->send(new BulkMail($subject, $htmlBody));

            // 6. Update trigger log success status
            $logModel->update([
                'status' => 'success',
                'triggered_at' => now(),
            ]);

            Log::info("Trigger Automation Email sent successfully to {$recipient->email} for automation ID {$automation->id}");

        } catch (\Exception $e) {
            Log::error("Trigger Automation Email failed to send to {$recipient->email}: " . $e->getMessage());
            
            if ($logModel) {
                $logModel->update([
                    'status' => 'failed',
                    'response' => substr($e->getMessage(), 0, 255),
                ]);
            }

            if ($this->attempts() <= $this->tries) {
                $this->release($this->backoff[$this->attempts() - 1] ?? 300);
            } else {
                $this->fail($e);
            }
        }
    }
}
