<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaign_csv_insights', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedBigInteger('organization_id');
            // The field_name is whatever column the CSV happened to have
            // e.g. 'gender', 'city', 'role', 'company', 'country' — fully dynamic
            $table->string('field_name', 100);
            $table->unsignedSmallInteger('unique_count')->default(0);
            // distribution: {"male":3200,"female":2800} — top 50 values by frequency
            $table->json('distribution');
            $table->tinyInteger('is_recommended')->default(0); // uniqueCount 2-10
            $table->enum('field_type', ['categorical', 'text'])->default('categorical');
            $table->timestamps();

            $table->index('campaign_id', 'idx_insights_campaign');
            $table->index(['organization_id', 'field_name'], 'idx_insights_org_field');
            // One set of insights per campaign per field (upsertable)
            $table->unique(['campaign_id', 'field_name'], 'uq_campaign_field');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_csv_insights');
    }
};
