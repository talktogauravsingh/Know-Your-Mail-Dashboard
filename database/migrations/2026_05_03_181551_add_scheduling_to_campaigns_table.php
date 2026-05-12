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
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('schedule_type')->default('immediate');
            $table->dateTime('scheduled_at')->nullable();
            $table->string('schedule_frequency')->nullable();
            $table->json('schedule_days')->nullable();
            $table->time('schedule_time')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'schedule_type',
                'scheduled_at',
                'schedule_frequency',
                'schedule_days',
                'schedule_time',
            ]);
        });
    }
};
