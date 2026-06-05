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
        // 1. Relay Providers
        Schema::create('relay_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->json('config'); // AWS credentials, Mailgun keys, etc.
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(1);
            $table->decimal('health_score', 5, 2)->default(100.00);
            $table->timestamps();
        });

        // 2. Outbound Messages
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('smtp_credential_id')->nullable()->constrained('smtp_credentials')->nullOnDelete();
            $table->foreignId('domain_id')->nullable()->constrained('sender_domains')->cascadeOnDelete();
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->string('subject')->nullable();
            $table->timestamps();
        });

        // 3. Message Recipients
        Schema::create('message_recipients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('message_id');
            $table->foreign('message_id')->references('id')->on('messages')->cascadeOnDelete();
            $table->string('recipient_email');
            $table->string('status')->default('queued'); // queued, sent, delivered, failed, bounced, complained, unsubscribed
            $table->uuid('relay_provider_id')->nullable();
            $table->foreign('relay_provider_id')->references('id')->on('relay_providers')->nullOnDelete();
            $table->string('relay_message_id')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        // 4. Tracked Links
        Schema::create('tracked_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('message_id');
            $table->foreign('message_id')->references('id')->on('messages')->cascadeOnDelete();
            $table->text('original_url');
            $table->string('short_code');
            $table->timestamps();
        });

        // 5. Events
        Schema::create('events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('recipient_id');
            $table->foreign('recipient_id')->references('id')->on('message_recipients')->cascadeOnDelete();
            $table->string('event_type'); // opened, clicked, bounced, complained, unsubscribed, delivered
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('details')->nullable();
            $table->timestamps();
        });

        // 6. Webhooks
        Schema::create('webhooks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->text('url');
            $table->string('secret');
            $table->json('events'); // Array of subscribed events
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 7. Webhook Logs
        Schema::create('webhook_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('webhook_id');
            $table->foreign('webhook_id')->references('id')->on('webhooks')->cascadeOnDelete();
            $table->uuid('event_id')->nullable();
            $table->foreign('event_id')->references('id')->on('events')->nullOnDelete();
            $table->json('payload');
            $table->integer('response_status')->nullable();
            $table->text('response_body')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->timestamps();
        });

        // 8. IP Reputation
        Schema::create('ip_reputation', function (Blueprint $table) {
            $table->string('ip')->primary();
            $table->integer('abuse_score')->default(0);
            $table->boolean('is_blocked')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ip_reputation');
        Schema::dropIfExists('webhook_logs');
        Schema::dropIfExists('webhooks');
        Schema::dropIfExists('events');
        Schema::dropIfExists('tracked_links');
        Schema::dropIfExists('message_recipients');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('relay_providers');
    }
};
