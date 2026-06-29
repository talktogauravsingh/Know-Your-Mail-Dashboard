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
        Schema::create('trigger_automations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('organization_id');
            $table->string('name');
            $table->string('status')->default('draft'); // draft, active, paused
            $table->unsignedBigInteger('trigger_campaign_id');
            $table->json('trigger_variant_ids')->nullable(); // specific segment/variant IDs
            $table->string('trigger_event'); // open, click
            $table->string('trigger_click_url')->nullable(); // specific click URL filter
            $table->unsignedBigInteger('action_template_id');
            $table->string('action_subject');
            $table->json('action_variable_mappings')->nullable(); // template variable -> recipient field mappings
            $table->timestamps();

            // Foreign keys & indices
            $table->index('organization_id');
            $table->foreign('trigger_campaign_id')->references('id')->on('campaigns')->onDelete('cascade');
            $table->foreign('action_template_id')->references('id')->on('email_templates')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trigger_automations');
    }
};
