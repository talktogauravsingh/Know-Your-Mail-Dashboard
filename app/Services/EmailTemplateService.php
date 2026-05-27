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

    /**
     * Merge campaign body content into template's {{content}} block,
     * then substitute all other template variables.
     *
     * Process:
     * 1. Replace {{content}} with the campaign body
     * 2. Substitute all other template variables
     * 3. Re-purify the output to ensure safety
     */
    public function mergeWithContent(EmailTemplate $template, string $body, array $variables = []): string
    {
        // Start with the template HTML
        $html = $template->html_content ?? '';

        // First, replace {{content}} with the campaign body
        // The body should already be sanitized, but we'll be careful
        $merged = str_replace('{{content}}', $body, $html);

        // Then substitute all other template variables
        $engine = new TemplateVariableEngine();
        $rendered = $engine->render($merged, $variables);

        // Re-purify the final output to ensure all content is safe
        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', storage_path('app/purifier'));
        $purifier = new HTMLPurifier($config);
        $safeHtml = $purifier->purify($rendered);

        return $safeHtml;
    }
}
