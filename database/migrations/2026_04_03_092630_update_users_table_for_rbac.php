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
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
            $table->foreignId('role_id')->after('id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('organization_id')->nullable()->after('role_id')->constrained('organizations')->onDelete('set null');
            $table->foreignId('created_by')->nullable()->after('organization_id')->constrained('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
            $table->dropForeign(['organization_id']);
            $table->dropColumn('organization_id');
            $table->dropForeign(['created_by']);
            $table->dropColumn('created_by');
            $table->enum('role', ['user', 'admin'])->default('user');
        });
    }
};
