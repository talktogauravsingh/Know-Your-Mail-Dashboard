<?php

namespace App\Services;

use App\Models\EmailTemplate;
use HTMLPurifier;
use HTMLPurifier_Config;

class EmailTemplateService
{
    /**
     * Render an EmailTemplate with given variables.
     *
     * The template HTML is first sanitized on save using HTMLPurifier.
     * When rendering, we substitute variables safely and re‑sanitize the output
     * to prevent injection of malicious markup through variable values.
     */
    public function render(EmailTemplate $template, array $variables = []): string
    {
        // Retrieve the stored HTML content (already purified on storage)
        $html = $template->html_content ?? '';

        // Perform variable substitution using the TemplateVariableEngine service
        $engine = new TemplateVariableEngine();
        $rendered = $engine->render($html, $variables);

        // Re‑purify the rendered HTML to ensure any variable data cannot break the allow‑list
        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', storage_path('app/purifier'));
        // Use the same configuration as in the model (allow‑list of safe tags/attributes)
        $purifier = new HTMLPurifier($config);
        $safeHtml = $purifier->purify($rendered);

        return $safeHtml;
    }
}
