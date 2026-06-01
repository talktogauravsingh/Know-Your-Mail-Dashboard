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
        Schema::table('conversions', function (Blueprint $table) {
            $table->string('event_id')->nullable()->unique()->after('id')->comment('Unique event identifier for deduplication');
            $table->timestamp('event_time')->nullable()->after('currency')->comment('Timestamp of actual event occurrence');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversions', function (Blueprint $table) {
            $table->dropUnique(['event_id']);
            $table->dropColumn(['event_id', 'event_time']);
        });
    }
};
