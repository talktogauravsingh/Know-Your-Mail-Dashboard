<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailAIVariant extends Model
{
    protected $table = 'email_ai_variants';

    protected $fillable = [
        'user_id',
        'goal',
        'tone',
        'audience',
        'request_payload',
        'subject',
        'content',
        'cta_suggestions',
        'meta',
        'api_response',
    ];

    protected $casts = [
        'request_payload' => 'array',
        'cta_suggestions' => 'array',
        'meta' => 'array',
        'api_response' => 'array',
    ];
}
