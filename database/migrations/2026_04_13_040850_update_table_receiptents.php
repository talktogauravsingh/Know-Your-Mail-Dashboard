<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            if (!Schema::hasColumn('recipients', 'organization_id')) {
                $table->unsignedBigInteger('organization_id');
            }
            if (!Schema::hasColumn('recipients', 'attributes')) {
                $table->json('attributes')->nullable();
            }
            if (!Schema::hasColumn('recipients', 'lead_type')) {
                $table->string('lead_type', 50)->nullable();
            }
            if (!Schema::hasColumn('recipients', 'city')) {
                $table->string('city', 100)->nullable();
            }
            if (!Schema::hasColumn('recipients', 'gender')) {
                $table->string('gender', 20)->nullable();
            }

            $table->index(['organization_id', 'lead_type'], 'idx_org_lead_type');
            $table->index(['organization_id', 'city'], 'idx_org_city');
            $table->index(['organization_id', 'email'], 'idx_org_email');
        });

        if (Schema::hasColumn('recipients', 'attributes')) {
            DB::statement('ALTER TABLE recipients ALTER COLUMN attributes TYPE jsonb USING attributes::jsonb');
        }
    }

    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            if (Schema::hasColumn('recipients', 'gender')) {
                $table->dropColumn('gender');
            }
            if (Schema::hasColumn('recipients', 'city')) {
                $table->dropColumn('city');
            }
            if (Schema::hasColumn('recipients', 'lead_type')) {
                $table->dropColumn('lead_type');
            }
            if (Schema::hasColumn('recipients', 'attributes')) {
                $table->dropColumn('attributes');
            }
            if (Schema::hasColumn('recipients', 'organization_id')) {
                $table->dropColumn('organization_id');
            }
        });
    }
};