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
        Schema::table('sender_domains', function (Blueprint $table) {
            $table->boolean('cname_verified')->default(false)->after('dmarc_verified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sender_domains', function (Blueprint $table) {
            $table->dropColumn('cname_verified');
        });
    }
};
