<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->unique(['agent_id', 'email'], 'recipients_agent_email_unique');
            $table->string('validation_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->dropUnique('recipients_agent_email_unique');
        });
    }
};
