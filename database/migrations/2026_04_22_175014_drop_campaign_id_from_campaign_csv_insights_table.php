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
        Schema::table('campaign_csv_insights', function (Blueprint $table) {
            // Drop existing unique index that includes campaign_id
            $table->dropUnique('uq_campaign_field');
            // Drop other indexes that include campaign_id if they exist
            $table->dropIndex('idx_insights_campaign');
            
            $table->dropColumn('campaign_id');
            
            // Add new unique index for the two-level modules
            $table->unique(['module_type', 'module_id', 'field_name'], 'uq_module_field');
        });
    }

    public function down(): void
    {
        Schema::table('campaign_csv_insights', function (Blueprint $table) {
            $table->unsignedBigInteger('campaign_id')->nullable()->after('id');
        });
    }
};
