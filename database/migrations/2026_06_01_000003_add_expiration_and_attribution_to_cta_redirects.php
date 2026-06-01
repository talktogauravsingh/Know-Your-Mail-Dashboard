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
        Schema::table('cta_redirects', function (Blueprint $table) {
            $table->dateTime('expires_at')->nullable()->after('converted_at')->comment('Redirect token expiration');
            $table->unsignedInteger('attribution_window_days')->default(30)->after('expires_at')->comment('Days to attribute conversions after click');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cta_redirects', function (Blueprint $table) {
            $table->dropColumn(['expires_at', 'attribution_window_days']);
        });
    }
};
