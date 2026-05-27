<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_ai_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('goal')->nullable();
            $table->string('tone')->nullable();
            $table->string('audience')->nullable();
            $table->json('request_payload')->nullable();
            $table->string('subject')->nullable();
            $table->text('content')->nullable();
            $table->json('cta_suggestions')->nullable();
            $table->json('meta')->nullable();
            $table->json('api_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_ai_variants');
    }
};
