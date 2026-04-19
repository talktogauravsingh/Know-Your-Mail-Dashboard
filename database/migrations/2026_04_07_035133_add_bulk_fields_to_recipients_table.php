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
        Schema::table('recipients', function (Blueprint $table) {
            $table->foreignId('agent_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('phone')->nullable();
            $table->json('additional_detail')->nullable();
            $table->foreignId('organization_id')->constrained('organizations')->nullable()->onDelete('cascade');
        });
    }

};
