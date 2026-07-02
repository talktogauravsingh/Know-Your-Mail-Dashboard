<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class MessageRecipient extends Model
{
    use HasUuids;

    protected $fillable = [
        'message_id',
        'recipient_email',
        'status',
        'relay_provider_id',
        'relay_message_id',
        'error_message',
        'sent_at',
        'delivered_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    public function message()
    {
        return $this->belongsTo(Message::class);
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'recipient_id');
    }
}
