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
            $table->text('dkim_private_key')->nullable()->after('dkim_public_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sender_domains', function (Blueprint $table) {
            $table->dropColumn('dkim_private_key');
        });
    }
};
