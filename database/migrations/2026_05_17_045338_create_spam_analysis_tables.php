<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('key')->unique();
            $table->text('scopes')->nullable(); // JSON array
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->boolean('is_revoked')->default(false);
            $table->timestamps();
        });

        Schema::create('spam_analysis_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('type'); // content, full
            $table->string('request_ip')->nullable();
            $table->text('payload_hash')->nullable();
            $table->decimal('spam_score', 5, 4); // 0 to 1
            $table->string('classification')->nullable();
            $table->json('reasons')->nullable();
            $table->json('raw_response')->nullable();
            $table->integer('latency_ms')->nullable();
            $table->timestamps();
            
            $table->index('created_at');
            $table->index('payload_hash');
        });

        Schema::create('abuse_tracking', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address')->index();
            $table->string('user_agent')->nullable();
            $table->string('threat_type');
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['ip_address', 'created_at']);
        });

        Schema::create('domain_reputation_cache', function (Blueprint $table) {
            $table->id();
            $table->string('domain')->unique();
            $table->json('reputation_data');
            $table->timestamp('expires_at');
            $table->timestamps();
        });

        Schema::create('url_scan_cache', function (Blueprint $table) {
            $table->id();
            $table->string('url_hash')->unique();
            $table->text('url');
            $table->json('scan_results');
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('url_scan_cache');
        Schema::dropIfExists('domain_reputation_cache');
        Schema::dropIfExists('abuse_tracking');
        Schema::dropIfExists('spam_analysis_history');
        Schema::dropIfExists('api_keys');
    }
};
