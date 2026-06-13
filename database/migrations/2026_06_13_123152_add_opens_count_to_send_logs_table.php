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
            if (!Schema::hasColumn('send_logs', 'opens_count')) {
                $table->unsignedInteger('opens_count')->default(0)->after('delivered_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {
            if (Schema::hasColumn('send_logs', 'opens_count')) {
                $table->dropColumn('opens_count');
            }
        });
    }
};
