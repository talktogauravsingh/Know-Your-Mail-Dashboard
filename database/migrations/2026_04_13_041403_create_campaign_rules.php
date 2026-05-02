<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaign_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');
            $table->unsignedBigInteger('variant_id');

            $table->string('condition_key');     // lead_type
            $table->string('condition_operator')->default('=');
            $table->string('condition_value');   // hot

            $table->timestamps();

            $table->index('campaign_id');
            $table->index('variant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_rules');
    }
};