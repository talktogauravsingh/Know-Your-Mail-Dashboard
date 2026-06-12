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
        Schema::create('smtp_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('username')->unique();
            $table->string('password_hash');
            $table->foreignId('domain_id')->nullable()->constrained('sender_domains')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->integer('rate_limit_per_hour')->default(10000);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('smtp_credentials');
    }
};
