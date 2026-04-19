<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // 'single' = old single body campaign, 'segmented' = new multi-variant
            $table->enum('segmentation_mode', ['single', 'segmented'])
                  ->default('single')
                  ->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('segmentation_mode');
        });
    }
};
