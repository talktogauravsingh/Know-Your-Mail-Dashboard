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
            if (Schema::hasColumn('campaigns', 'variants')) {
                $table->dropColumn('variants');
            }
        });

        Schema::table('campaign_variants', function (Blueprint $table) {
            $table->string('cta_url')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->json('variants')->nullable()->after('cta_url');
        });

        Schema::table('campaign_variants', function (Blueprint $table) {
            $table->dropColumn('cta_url');
        });
    }
};
