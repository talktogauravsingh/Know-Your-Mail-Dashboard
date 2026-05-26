<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_subscriptions', function (Blueprint $table) {
            $table->dateTime('current_period_start')->nullable()->after('renews_at');
            $table->dateTime('current_period_end')->nullable()->after('current_period_start');
            $table->dateTime('due_date')->nullable()->after('current_period_end');
        });
    }

    public function down(): void
    {
        Schema::table('organization_subscriptions', function (Blueprint $table) {
            $table->dropColumn(['current_period_start', 'current_period_end', 'due_date']);
        });
    }
};
