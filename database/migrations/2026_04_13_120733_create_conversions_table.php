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
        Schema::create('conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained()->onDelete('cascade');
            $table->string('email');
            $table->string('event_type')->default('purchase');
            $table->decimal('value', 10, 2)->default(0);
            $table->string('currency')->default('USD');
            $table->timestamp('event_time')->useCurrent();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['campaign_id', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversions');
    }
};

