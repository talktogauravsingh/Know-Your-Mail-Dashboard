<?php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;

class EmailTemplatePurifierTest extends TestCase
{
    /**
     * Test that EmailTemplate model HTML purifier allows styles and classes,
     * but strictly removes malicious tags like <script> or event handlers.
     */
    public function test_email_template_purifier_preserves_styles_and_classes()
    {
        $template = new EmailTemplate();

        // 1. Safe HTML with classes and inline styles
        $safeInput = '<div class="premium-layout" style="background-color: #f8fafc; padding: 20px;"><p style="font-size: 16px; color: #1e293b;">Hello, world!</p></div>';
        
        $template->html_content = $safeInput;
        
        // Assert that the style and class attributes are completely preserved
        $this->assertStringContainsString('class="premium-layout"', $template->html_content);
        $this->assertStringContainsString('style="background-color:#f8fafc;padding:20px;"', str_replace(' ', '', $template->html_content));
        $this->assertStringContainsString('style="font-size:16px;color:#1e293b;"', str_replace(' ', '', $template->html_content));

        // 2. Malicious HTML with script injection
        $maliciousInput = '<div class="card" style="color: red;"><script>alert("XSS")</script><p onclick="alert(\'XSS\')">Click me</p></div>';
        
        $template->html_content = $maliciousInput;

        // Assert that the script tag is completely removed, the onclick event handler is removed,
        // but the safe card class and color style are preserved.
        $this->assertStringNotContainsString('<script>', $template->html_content);
        $this->assertStringNotContainsString('onclick', $template->html_content);
        $this->assertStringContainsString('class="card"', $template->html_content);
        $this->assertStringContainsString('style="color:#FF0000;"', str_replace(' ', '', $template->html_content));
    }
}
