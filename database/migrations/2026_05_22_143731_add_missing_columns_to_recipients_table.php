<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            // Add columns only if they do not already exist
            if (!Schema::hasColumn('recipients', 'module_type')) {
                $table->tinyInteger('module_type')->default(2);
            }
            if (!Schema::hasColumn('recipients', 'module_id')) {
                $table->unsignedBigInteger('module_id')->nullable();
            }
            if (!Schema::hasColumn('recipients', 'agent_id')) {
                $table->unsignedBigInteger('agent_id');
            }
            if (!Schema::hasColumn('recipients', 'name')) {
                $table->string('name');
            }
            if (!Schema::hasColumn('recipients', 'phone')) {
                $table->string('phone')->nullable();
            }
            if (!Schema::hasColumn('recipients', 'organization_id')) {
                $table->unsignedBigInteger('organization_id');
            }
        });

        // Add indexes for the newly added foreign‑key columns if they were created
        Schema::table('recipients', function (Blueprint $table) {
            if (!Schema::hasColumn('recipients', 'organization_id')) {
                // column missing, no index needed
            } else {
                $table->index('organization_id');
            }
            if (!Schema::hasColumn('recipients', 'agent_id')) {
                // column missing, no index needed
            } else {
                $table->index('agent_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            if (Schema::hasColumn('recipients', 'module_type')) {
                $table->dropColumn('module_type');
            }
            if (Schema::hasColumn('recipients', 'module_id')) {
                $table->dropColumn('module_id');
            }
            if (Schema::hasColumn('recipients', 'agent_id')) {
                $table->dropColumn('agent_id');
            }
            if (Schema::hasColumn('recipients', 'name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('recipients', 'phone')) {
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('recipients', 'organization_id')) {
                $table->dropColumn('organization_id');
            }
        });
    }
};
