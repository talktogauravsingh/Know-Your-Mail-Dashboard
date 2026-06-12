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
        Schema::create('daily_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('domain_id')->constrained('sender_domains')->cascadeOnDelete();
            $table->date('date')->default(now()->toDateString());
            $table->integer('sent_count')->default(0);
            $table->integer('delivered_count')->default(0);
            $table->integer('bounce_count')->default(0);
            $table->integer('complaint_count')->default(0);
            $table->integer('open_count')->default(0);
            $table->integer('real_open_count')->default(0);
            $table->integer('click_count')->default(0);
            $table->timestamps();

            $table->unique(['organization_id', 'domain_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_analytics');
    }
};
