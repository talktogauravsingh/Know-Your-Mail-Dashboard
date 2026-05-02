<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->dropColumn('campaign_id');
            $table->renameColumn('additional_detail', 'attributes');
        });

        DB::statement("
            ALTER TABLE recipients 
            ADD COLUMN lead_type VARCHAR(50) 
            GENERATED ALWAYS AS (JSON_UNQUOTE(attributes->'$.lead_type')) STORED
        ");

        // DB::statement("
        //     ALTER TABLE recipients 
        //     ADD COLUMN city VARCHAR(100) 
        //     GENERATED ALWAYS AS (JSON_UNQUOTE(attributes->'$.city')) STORED
        // ");

        // DB::statement("
        //     ALTER TABLE recipients 
        //     ADD COLUMN gender VARCHAR(20) 
        //     GENERATED ALWAYS AS (JSON_UNQUOTE(attributes->'$.gender')) STORED
        // ");

        // Indexes
        Schema::table('recipients', function (Blueprint $table) {
            $table->index(['organization_id', 'lead_type'], 'idx_org_lead_type');
            // $table->index(['organization_id', 'city'], 'idx_org_city');
            // $table->index(['organization_id', 'email'], 'idx_org_email');
        });
    }

    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->json('additional_detail')->nullable();
            $table->dropColumn(['lead_type', 'city', 'gender']);
            $table->dropIndex('idx_org_lead_type');
            $table->dropIndex('idx_org_city');
            $table->dropIndex('idx_org_email');

            $table->bigInteger('campaign_id')->unsigned()->nullable();
        });
    }
};