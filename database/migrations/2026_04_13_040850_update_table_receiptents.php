<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('recipients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->string('email')->nullable();

            // JSON column
            $table->json('attributes')->nullable();

            // Generated columns (defined directly)
            $table->string('lead_type', 50);

            $table->string('city', 100);

            $table->string('gender', 20);

            $table->timestamps();

            // Indexes
            $table->index(['organization_id', 'lead_type'], 'idx_org_lead_type');
            $table->index(['organization_id', 'city'], 'idx_org_city');
            $table->index(['organization_id', 'email'], 'idx_org_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recipients');
    }
};