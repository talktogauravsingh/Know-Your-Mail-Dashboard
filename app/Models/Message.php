<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Message extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'smtp_credential_id',
        'domain_id',
        'from_email',
        'from_name',
        'subject',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function smtpCredential()
    {
        return $this->belongsTo(SmtpCredential::class);
    }

    public function domain()
    {
        return $this->belongsTo(SenderDomain::class, 'domain_id');
    }

    public function recipients()
    {
        return $this->hasMany(MessageRecipient::class);
    }
}
