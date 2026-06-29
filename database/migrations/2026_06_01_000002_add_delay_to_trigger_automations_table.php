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
        Schema::table('trigger_automations', function (Blueprint $table) {
            $table->integer('delay_hours')->default(0);
            $table->integer('delay_minutes')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('trigger_automations', function (Blueprint $table) {
            $table->dropColumn(['delay_hours', 'delay_minutes']);
        });
    }
};
