<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Add template_id as nullable foreign key
            $table->unsignedBigInteger('template_id')->nullable()->after('cta_url');
            $table->foreign('template_id')
                ->references('id')
                ->on('email_templates')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->dropColumn('template_id');
        });
    }
};
