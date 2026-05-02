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
        Schema::table('recipients', function (Blueprint $table) {
            $table->tinyInteger('module_type')->default(2)->after('id')->comment('1=Org, 2=Campaign');
            $table->unsignedBigInteger('module_id')->nullable()->after('module_type');
            $table->index(['module_type', 'module_id']);
        });

        Schema::table('campaign_csv_insights', function (Blueprint $table) {
            $table->unsignedBigInteger('campaign_id')->nullable()->change();
            $table->tinyInteger('module_type')->default(2)->after('id')->comment('1=Org, 2=Campaign');
            $table->unsignedBigInteger('module_id')->nullable()->after('module_type');
            $table->index(['module_type', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->dropColumn(['module_type', 'module_id']);
        });

        Schema::table('campaign_csv_insights', function (Blueprint $table) {
            $table->unsignedBigInteger('campaign_id')->nullable(false)->change();
            $table->dropColumn(['module_type', 'module_id']);
        });
    }
};
