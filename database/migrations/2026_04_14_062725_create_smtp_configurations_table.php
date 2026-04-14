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
        Schema::create('smtp_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->onDelete('cascade');
            $table->string('provider')->default('custom');
            $table->string('host');
            $table->integer('port');
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('encryption')->nullable();
            $table->string('from_name');
            $table->string('from_address');
            $table->boolean('is_global')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('smtp_configurations');
    }
};
