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
        Schema::table('conversions', function (Blueprint $table) {
            $table->foreignId('cta_redirect_id')
                ->nullable()
                ->constrained('cta_redirects')
                ->nullOnDelete()
                ->after('campaign_id');

            $table->index('cta_redirect_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversions', function (Blueprint $table) {
            $table->dropForeign(['cta_redirect_id']);
            $table->dropIndex(['cta_redirect_id']);
            $table->dropColumn('cta_redirect_id');
        });
    }
};
