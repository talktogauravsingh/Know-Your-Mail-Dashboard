<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('campaign_variants', function (Blueprint $table) {
            // Marks this variant as the default/fallback segment
            $table->tinyInteger('is_default')->default(0)->after('name');
            // Lower priority number = evaluated first during segment matching
            $table->unsignedSmallInteger('priority')->default(0)->after('is_default');
        });
    }

    public function down(): void
    {
        Schema::table('campaign_variants', function (Blueprint $table) {
            $table->dropColumn(['is_default', 'priority']);
        });
    }
};
