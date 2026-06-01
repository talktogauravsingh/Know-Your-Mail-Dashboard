<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tracking_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->foreignId('cta_redirect_id')->constrained('cta_redirects')->onDelete('cascade');
            $table->string('tracking_token')->unique();
            $table->string('device_fingerprint')->nullable();
            $table->timestamp('clicked_at');
            $table->timestamp('expires_at');
            $table->integer('attribution_window_days')->default(30);
            $table->timestamps();

            $table->index(['tracking_token', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracking_sessions');
    }
};
