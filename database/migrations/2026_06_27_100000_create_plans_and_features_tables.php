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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->string('name', 128);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('is_active')->default(1)->comment('0 = Inactive, 1 = Active');
            $table->bigInteger('price_minor')->default(0);
            $table->string('currency', 8)->default('INR');
            $table->string('billing_interval', 32)->default('month');
            $table->integer('sort_order')->default(10);
            $table->timestamps();
        });

        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('key', 64)->unique();
            $table->string('name', 128);
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('is_active')->default(1)->comment('0 = Inactive, 1 = Active');
            $table->timestamps();
        });

        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->onDelete('cascade');
            $table->foreignId('feature_id')->constrained('features')->onDelete('cascade');
            $table->unsignedTinyInteger('is_enabled')->default(1)->comment('0 = Disabled, 1 = Enabled');
            $table->integer('limit_value')->nullable()->comment('Null means unlimited, integer specifies quota limit');
            $table->timestamps();

            $table->unique(['plan_id', 'feature_id']);
        });

        Schema::create('organization_feature_credits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('feature_key', 64)->index();
            $table->integer('credits_balance')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'feature_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_feature_credits');
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('features');
        Schema::dropIfExists('plans');
    }
};
