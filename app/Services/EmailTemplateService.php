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
        $serializerPath = storage_path('app/purifier');
        if (!is_dir($serializerPath)) {
            @mkdir($serializerPath, 0775, true);
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', $serializerPath);
        // Use the same configuration as in the model (allow‑list of safe tags/attributes)
        $config->set('HTML.Allowed', 'p[style|class],b[style|class],i[style|class],u[style|class],strong[style|class],em[style|class],ul[style|class],ol[style|class],li[style|class],br,img[src|alt|title|width|height|style|class],a[href|title|target|style|class],table[style|class|width|cellpadding|cellspacing|border|align],thead[style|class],tbody[style|class],tr[style|class],th[style|class|width|align],td[style|class|width|align|valign],div[style|class],span[style|class],hr[style|class]');
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
        $serializerPath = storage_path('app/purifier');
        if (!is_dir($serializerPath)) {
            @mkdir($serializerPath, 0775, true);
        }

        $config = HTMLPurifier_Config::createDefault();
        $config->set('Cache.SerializerPath', $serializerPath);
        // Use the same configuration as in the model (allow‑list of safe tags/attributes)
        $config->set('HTML.Allowed', 'p[style|class],b[style|class],i[style|class],u[style|class],strong[style|class],em[style|class],ul[style|class],ol[style|class],li[style|class],br,img[src|alt|title|width|height|style|class],a[href|title|target|style|class],table[style|class|width|cellpadding|cellspacing|border|align],thead[style|class],tbody[style|class],tr[style|class],th[style|class|width|align],td[style|class|width|align|valign],div[style|class],span[style|class],hr[style|class]');
        $purifier = new HTMLPurifier($config);

        $safeHtml = $purifier->purify($rendered);

        return $safeHtml;
    }
}
