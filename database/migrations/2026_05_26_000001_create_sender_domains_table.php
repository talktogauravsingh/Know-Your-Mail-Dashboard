<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sender_domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('domain');                           // e.g. marketing.example.com
            // Verification status: pending | verified | failed
            $table->string('status')->default('pending');
            // DNS records the customer must create
            $table->string('cname_target')->nullable();         // our relay host for tracking
            $table->string('dkim_selector')->nullable();        // e.g. kym._domainkey
            $table->text('dkim_public_key')->nullable();
            $table->boolean('spf_verified')->default(false);
            $table->boolean('dkim_verified')->default(false);
            $table->boolean('dmarc_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'domain']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sender_domains');
    }
};
