<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaign_variants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('campaign_id');

            $table->string('name')->nullable();
            $table->string('subject');
            $table->text('body');

            $table->timestamps();

            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_variants');
    }
};