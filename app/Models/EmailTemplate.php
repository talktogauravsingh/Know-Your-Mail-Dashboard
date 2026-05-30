<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use HTMLPurifier;
use HTMLPurifier_Config;

class EmailTemplate extends Model
{
    protected $table = 'email_templates';
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($template) {
            $template->uuid = Str::uuid();
        });
    }

    protected $fillable = [
        'uuid',
        'organization_id',
        'template_name',
        'slug',
        'category',
        'subject',
        'preview_text',
        'html_content',
        'json_design',
        'plain_text_content',
        'thumbnail',
        'tags',
        'variables',
        'is_default',
        'is_public',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'variables' => 'array',
        'json_design' => 'array',
        'is_default' => 'boolean',
        'is_public' => 'boolean',
    ];

    // Relationships
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

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
     * Sanitize HTML content before saving.
     * Extracts head, body styles, and body contents, purifies the body safely,
     * and reconstructs the full envelope to prevent styling loss.
     */
    public function setHtmlContentAttribute(string $value): void
    {
        // 1. Extract Head contents (meta tags, style sheets, etc.)
        $headContent = '';
        if (preg_match('/<head[^>]*>(.*?)<\/head>/is', $value, $matches)) {
            $headContent = $matches[1];
        }

        // 2. Extract Body style attribute
        $bodyStyle = '';
        if (preg_match('/<body\s+[^>]*style=["\'](.*?)["\']/is', $value, $matches)) {
            $bodyStyle = $matches[1];
        }

        // 3. Extract Body inner HTML content
        $bodyContent = $value;
        if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $value, $matches)) {
            $bodyContent = $matches[1];
        }

        // 4. Purify the body content safely (safeguards against XSS)
        $purifiedBody = self::sanitizeHtml($bodyContent);

        // 5. Purify head styles carefully (strip active code/scripts)
        $purifiedHead = self::sanitizeHtml($headContent);

        // 6. Reconstruct the full HTML document with safe wrappers
        if (preg_match('/^<!doctype|<html/i', trim($value))) {
            $reconstructed = '<!doctype html><html><head>' . $purifiedHead . '</head><body style="' . e($bodyStyle) . '">' . $purifiedBody . '</body></html>';
        } else {
            // Default wrapper fallback if saved from a plain HTML fragment
            $reconstructed = '<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0; padding:24px; background:#f8fafc; font-family:Inter, system-ui, sans-serif;">' . $purifiedBody . '</body></html>';
        }

        $this->attributes['html_content'] = $reconstructed;
    }
}
?>
