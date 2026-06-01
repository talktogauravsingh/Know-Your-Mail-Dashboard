<?php

namespace App\Services;

use App\Models\EmailTemplate;

class EmailTemplateService
{
    /**
     * Securely sanitizes template HTML contents.
     * Blocks script, iframe, object, embed tags, on* event handlers, and javascript: protocols.
     * 100% preserves custom layout elements (like section, h1, h2, h3) and inline CSS (like border-radius, flexbox, gap).
     */
    protected static function sanitizeHtml(string $html): string
    {
        if (empty($html)) {
            return '';
        }

        // 1. Strip script tags and their inner content
        $html = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $html);

        // 2. Strip iframe tags and their inner content
        $html = preg_replace('/<iframe[^>]*>.*?<\/iframe>/is', '', $html);

        // 3. Strip object, embed, applet, form, inputs, and buttons
        $html = preg_replace('/<(object|embed|applet|form|input|button|textarea)[^>]*>.*?<\/\\1>/is', '', $html);

        // 4. Strip inline event handlers (e.g. onclick, onload, onerror)
        $html = preg_replace('/on[a-z]+=\s*["\'].*?["\']/is', '', $html);
        $html = preg_replace('/on[a-z]+=\s*[^\s>]+/is', '', $html);

        // 5. Strip javascript: protocols in links/sources
        $html = preg_replace('/href=\s*["\']\s*javascript:.*?["\']/is', 'href="#"', $html);
        $html = preg_replace('/src=\s*["\']\s*javascript:.*?["\']/is', 'src=""', $html);

        return $html;
    }

    /**
     * Render an EmailTemplate with given variables.
     * Extracts, purifies, and reconstructs full envelopes, preserving styling.
     */
    public function render(EmailTemplate $template, array $variables = []): string
    {
        $html = $template->html_content ?? '';

        // Extract head contents
        $headContent = '';
        if (preg_match('/<head[^>]*>(.*?)<\/head>/is', $html, $matches)) {
            $headContent = $matches[1];
        }

        // Extract body styles
        $bodyStyle = '';
        if (preg_match('/<body\s+[^>]*style=["\'](.*?)["\']/is', $html, $matches)) {
            $bodyStyle = $matches[1];
        }

        // Extract body contents
        $bodyContent = $html;
        if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches)) {
            $bodyContent = $matches[1];
        }

        // Apply fallback envelope style for existing legacy templates that don't have them stored
        if (empty($headContent) && empty($bodyStyle)) {
            $headContent = '<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' . e($template->template_name) . '</title>';
            $bodyStyle = 'margin:0; padding:24px; background:#f8fafc; font-family:Inter, system-ui, sans-serif;';
        }

        // Perform variable substitution
        $engine = new TemplateVariableEngine();
        $renderedBody = $engine->render($bodyContent, $variables);

        // Purify body content safely
        $safeBody = self::sanitizeHtml($renderedBody);

        // Sanitize head styles
        $purifiedHead = self::sanitizeHtml($headContent);

        // Reconstruct the full HTML document
        return '<!doctype html><html><head>' . $purifiedHead . '</head><body style="' . e($bodyStyle) . '">' . $safeBody . '</body></html>';
    }

    /**
     * Merge campaign body content into template's {{content}} block,
     * then substitute all other template variables and reconstruct.
     */
    public function mergeWithContent(EmailTemplate $template, string $body, array $variables = []): string
    {
        $html = $template->html_content ?? '';

        // Extract head contents
        $headContent = '';
        if (preg_match('/<head[^>]*>(.*?)<\/head>/is', $html, $matches)) {
            $headContent = $matches[1];
        }

        // Extract body styles
        $bodyStyle = '';
        if (preg_match('/<body\s+[^>]*style=["\'](.*?)["\']/is', $html, $matches)) {
            $bodyStyle = $matches[1];
        }

        // Extract body contents
        $bodyContent = $html;
        if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches)) {
            $bodyContent = $matches[1];
        }

        // Apply fallback envelope style for existing legacy templates that don't have them stored
        if (empty($headContent) && empty($bodyStyle)) {
            $headContent = '<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' . e($template->template_name) . '</title>';
            $bodyStyle = 'margin:0; padding:24px; background:#f8fafc; font-family:Inter, system-ui, sans-serif;';
        }

        // First, replace {{content}} with the campaign body inside the body content
        $mergedBody = str_replace('{{content}}', $body, $bodyContent);

        // Then substitute all other template variables
        $engine = new TemplateVariableEngine();
        $renderedBody = $engine->render($mergedBody, $variables);

        // Purify body content safely
        $safeBody = self::sanitizeHtml($renderedBody);

        // Sanitize head styles
        $purifiedHead = self::sanitizeHtml($headContent);

        // Reconstruct the full HTML document
        return '<!doctype html><html><head>' . $purifiedHead . '</head><body style="' . e($bodyStyle) . '">' . $safeBody . '</body></html>';
    }

    /**
     * Generate a PNG thumbnail for the given template using a headless browser.
     * Returns the publicly accessible URL (Storage::url) or null on failure.
     *
     * Note: this method requires the `spatie/browsershot` package and a working
     * headless Chrome/Chromium environment. If the package is not installed this
     * method will simply return null.
     */
    public function generateThumbnail(EmailTemplate $template): ?string
    {
        try {
            if (!class_exists(\Spatie\Browsershot\Browsershot::class)) {
                return null;
            }

            $html = $this->render($template, []);

            $fileName = 'email-template-thumbnails/template-' . $template->id . '-' . time() . '.png';
            $storagePath = storage_path('app/public/' . $fileName);

            // Ensure directory exists
            $dir = dirname($storagePath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            \Spatie\Browsershot\Browsershot::html($html)
                ->windowSize(1200, 630)
                ->deviceScaleFactor(2)
                ->waitUntilNetworkIdle()
                ->save($storagePath);

            return \Illuminate\Support\Facades\Storage::url($fileName);
        } catch (\Throwable $e) {
            logger()->error('Thumbnail generation failed for template ' . $template->id . ': ' . $e->getMessage());
            return null;
        }
    }
}


