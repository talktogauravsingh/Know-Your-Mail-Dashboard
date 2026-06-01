<?php

namespace App\Jobs;

use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateTemplateThumbnail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $templateId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $templateId)
    {
        $this->templateId = $templateId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $template = EmailTemplate::find($this->templateId);
        if (! $template) {
            return;
        }

        $service = new EmailTemplateService();
        $thumbnailUrl = $service->generateThumbnail($template);
        if ($thumbnailUrl) {
            $template->thumbnail = $thumbnailUrl;
            $template->save();
        }
    }
}
