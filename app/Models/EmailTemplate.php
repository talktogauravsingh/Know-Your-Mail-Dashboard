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
     * Sanitize HTML content before saving.
     */
    public function setHtmlContentAttribute(string $value): void
    {
        $config = HTMLPurifier_Config::createDefault();
        // Restrict to safe HTML only; no scripts, no iframes. Allow inline styles and classes for premium email designs.
        $config->set('HTML.Allowed', 'p[style|class],b[style|class],i[style|class],u[style|class],strong[style|class],em[style|class],ul[style|class],ol[style|class],li[style|class],br,img[src|alt|title|width|height|style|class],a[href|title|target|style|class],table[style|class|width|cellpadding|cellspacing|border|align],thead[style|class],tbody[style|class],tr[style|class],th[style|class|width|align],td[style|class|width|align|valign],div[style|class],span[style|class],hr[style|class]');
        $purifier = new HTMLPurifier($config);
        $this->attributes['html_content'] = $purifier->purify($value);
    }
}
?>
