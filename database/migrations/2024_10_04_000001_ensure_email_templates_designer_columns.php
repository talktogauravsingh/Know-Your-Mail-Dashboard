<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * This migration ensures the email_templates table has all columns needed
     * for the TemplateDesigner frontend component, particularly for saving
     * visual editor state and rendering.
     */
    public function up(): void
    {
        Schema::table('email_templates', function (Blueprint $table) {
            // Ensure these columns exist; they are already in the original migration
            // but we verify they exist with proper types for the designer.
            if (!Schema::hasColumn('email_templates', 'plain_text_content')) {
                $table->text('plain_text_content')->nullable()->after('json_design');
            }
            if (!Schema::hasColumn('email_templates', 'thumbnail')) {
                $table->string('thumbnail')->nullable()->after('plain_text_content');
            }
            if (!Schema::hasColumn('email_templates', 'tags')) {
                $table->json('tags')->nullable()->after('thumbnail');
            }
            if (!Schema::hasColumn('email_templates', 'variables')) {
                $table->json('variables')->nullable()->after('tags');
            }
            if (!Schema::hasColumn('email_templates', 'is_default')) {
                $table->boolean('is_default')->default(false)->after('variables');
            }
            if (!Schema::hasColumn('email_templates', 'is_public')) {
                $table->boolean('is_public')->default(false)->after('is_default');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('email_templates', function (Blueprint $table) {
            // Note: Rollback is typically not recommended for this type of migration
            // as data could be lost. This is a safe-guard schema verification migration.
        });
    }
};
