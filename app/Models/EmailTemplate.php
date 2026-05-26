<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use HTMLPurifier;
use HTMLPurifier_Config;

class EmailTemplate extends Model
{
    protected $table = 'email_templates';

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
     * Sanitize HTML content before saving.
     */
    public function setHtmlContentAttribute(string $value): void
    {
        $config = HTMLPurifier_Config::createDefault();
        // Restrict to safe HTML only; no scripts, no iframes.
        $config->set('HTML.Allowed', 'p,b,i,u,strong,em,ul,ol,li,br,img[src|alt|title|width|height],a[href|title|target],table,thead,tbody,tr,th,td,div,span,hr');
        $purifier = new HTMLPurifier($config);
        $this->attributes['html_content'] = $purifier->purify($value);
    }
}
?>
