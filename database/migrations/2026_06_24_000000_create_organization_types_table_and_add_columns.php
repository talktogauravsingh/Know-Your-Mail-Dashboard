<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create organization_types table
        Schema::create('organization_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed default organization types
        DB::table('organization_types')->insert([
            [
                'name' => 'Individual',
                'slug' => 'individual',
                'description' => 'Personal projects or freelance work',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Marketing Agency',
                'slug' => 'marketing',
                'description' => 'Managing campaigns for multiple clients',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Sales',
                'slug' => 'sales',
                'description' => 'Outreach, prospecting, and sales campaigns',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Technology / SaaS',
                'slug' => 'technology',
                'description' => 'Software product or platform sending transactional emails',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Large scale sending with high volume requirements',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Other',
                'slug' => 'other',
                'description' => 'Any other category',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 2. Add org_type to organizations table
        Schema::table('organizations', function (Blueprint $table) {
            $table->unsignedBigInteger('org_type')->nullable();
            $table->foreign('org_type')->references('id')->on('organization_types')->nullOnDelete();
        });

        // 3. Add phone_number to users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_number')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone_number');
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropForeign(['org_type']);
            $table->dropColumn('org_type');
        });

        Schema::dropIfExists('organization_types');
    }
};
