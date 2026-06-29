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
        Schema::create('trigger_automation_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('automation_id');
            $table->unsignedBigInteger('recipient_id');
            $table->unsignedBigInteger('send_log_id');
            $table->timestamp('triggered_at')->nullable();
            $table->string('status')->default('pending'); // pending, success, failed
            $table->string('response')->nullable();
            $table->timestamps();

            // Foreign keys & indices
            $table->index(['automation_id', 'recipient_id']);
            $table->foreign('automation_id')->references('id')->on('trigger_automations')->onDelete('cascade');
            $table->foreign('recipient_id')->references('id')->on('recipients')->onDelete('cascade');
            $table->foreign('send_log_id')->references('id')->on('send_logs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trigger_automation_logs');
    }
};
