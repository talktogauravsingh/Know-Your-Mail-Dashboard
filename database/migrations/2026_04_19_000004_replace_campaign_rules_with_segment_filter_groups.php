<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Drop the old flat single-condition table (no production data yet)
        Schema::dropIfExists('campaign_rules');

        // A segment can have multiple filter GROUPS (groups are OR'd together)
        // Within a group, all filters must match (AND logic)
        // Example: (gender=male AND city=mumbai) OR (gender=male AND city=pune)
        Schema::create('segment_filter_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('variant_id'); // FK to campaign_variants
            // group_index just orders groups visually in the UI
            $table->unsignedTinyInteger('group_index')->default(0);
            $table->timestamps();

            $table->index('variant_id', 'idx_sfg_variant');
        });

        // Individual conditions within a group (all ANDed)
        // field_name is DYNAMIC — it's whatever column name came from the CSV
        // e.g. 'gender', 'city', 'role', 'company', 'country', 'age', 'source' etc.
        Schema::create('segment_filters', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('filter_group_id');
            // Fully dynamic — no enum — accepts any field from recipients.attributes
            $table->string('field_name', 100);
            $table->enum('operator', ['=', '!=', 'in', 'not_in', 'contains', 'starts_with'])
                  ->default('=');
            // For 'in'/'not_in', store comma-separated values: "mumbai,pune,delhi"
            $table->string('field_value', 1000);
            $table->timestamps();

            $table->index('filter_group_id', 'idx_sf_group');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('segment_filters');
        Schema::dropIfExists('segment_filter_groups');

        // Restore old table structure
        Schema::create('campaign_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('variant_id');
            $table->string('condition_key');
            $table->string('condition_operator')->default('=');
            $table->string('condition_value');
            $table->timestamps();
            $table->index('campaign_id');
            $table->index('variant_id');
        });
    }
};
