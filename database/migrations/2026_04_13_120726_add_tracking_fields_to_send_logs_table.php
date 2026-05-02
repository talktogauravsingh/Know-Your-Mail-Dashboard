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
        Schema::table('send_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('send_logs', 'sent_at')) {
                $table->timestamp('sent_at')->nullable()->after('opened_at');
            }
            if (!Schema::hasColumn('send_logs', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('sent_at');
            }
            if (!Schema::hasColumn('send_logs', 'clicks_count')) {
                $table->unsignedInteger('clicks_count')->default(0)->after('delivered_at');
            }
            if (!Schema::hasColumn('send_logs', 'bounce_type')) {
                $table->enum('bounce_type', ['none', 'hard', 'soft'])->default('none')->after('clicks_count');
            }
            if (!Schema::hasColumn('send_logs', 'bounce_count')) {
                $table->unsignedInteger('bounce_count')->default(0)->after('bounce_type');
            }
            if (!Schema::hasColumn('send_logs', 'region')) {
                $table->string('region')->nullable()->after('bounce_count');
            }
            if (!Schema::hasColumn('send_logs', 'last_activity_at')) {
                $table->timestamp('last_activity_at')->nullable()->after('region');
            }
            if (!Schema::hasColumn('send_logs', 'tracking_data')) {
                $table->json('tracking_data')->nullable()->after('last_activity_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {
            $table->dropColumn([
                'sent_at',
                'delivered_at', 
                'clicks_count',
                'bounce_type',
                'bounce_count',
                'region',
                'last_activity_at',
                'tracking_data'
            ]);
        });
    }
};

