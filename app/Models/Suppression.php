<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Suppression extends Model
{
    //
    protected $fillable = [
        'organization_id',
        'email',
        'reason'
    ];

    /**
     * Suppress an email address for an organization.
     */
    public static function suppress(int $orgId, string $email, string $reason): self
    {
        return self::updateOrCreate(
            ['organization_id' => $orgId, 'email' => strtolower(trim($email))],
            ['reason' => $reason]
        );
    }
}
