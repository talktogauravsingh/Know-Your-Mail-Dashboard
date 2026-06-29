<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TrackedLink extends Model
{
    use HasUuids;

    protected $fillable = [
        'message_id',
        'original_url',
        'short_code',
    ];

    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
