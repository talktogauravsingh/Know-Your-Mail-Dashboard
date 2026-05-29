<?php

namespace App\Services;

class TemplateVariableEngine
{
    /**
     * Extract variable names (including fallback) from a given content string.
     * Returns an array of variable identifiers (without fallback values).
     * Example: "Hello {{first_name|Guest}}" => ['first_name']
     */
    public function extractVariables(string $content): array
    {
        preg_match_all('/{{\s*([a-zA-Z0-9_]+)(?:\|[^}]*)?}}/', $content, $matches);
        return array_unique($matches[1]);
    }

    /**
     * Render content by replacing placeholders with provided data.
     * Supports fallback values using the pipe syntax: {{var|default}}.
     */
    public function render(string $content, array $variables = []): string
    {
        return preg_replace_callback('/{{\s*([a-zA-Z0-9_]+)(?:\|([^}]*))?}}/', function ($m) use ($variables) {
            $key = $m[1];
            $fallback = $m[2] ?? '';
            return $variables[$key] ?? $fallback;
        }, $content);
    }

    /**
     * Check if a given HTML content contains a {{content}} block.
     * This is used to determine if a template supports content injection.
     */
    public function hasContentBlock(string $html): bool
    {
        return str_contains($html, '{{content}}');
    }
}
