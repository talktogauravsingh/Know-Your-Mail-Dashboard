<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('user_id')->index();

            // Idempotency for order creation
            $table->string('idempotency_key', 128)->index();

            // Provider + reference identifiers
            $table->string('provider', 32)->index(); // e.g. 'razorpay_standard'
            $table->string('provider_order_id', 128)->unique()->nullable();
            $table->string('provider_payment_id', 128)->unique()->nullable();

            // Payment request details (trusted backend-generated)
            $table->string('currency', 8);
            $table->bigInteger('amount_minor'); // store smallest currency unit (e.g. paise)

            // Frontend correlation
            $table->string('client_reference_id', 128)->nullable()->index();

            // State lifecycle
            $table->string('status', 64)->index(); 
            $table->timestamp('expires_at')->nullable();

            // Audit-safe raw payloads
            $table->json('request_payload')->nullable(); // sanitized/allowed fields
            $table->json('verification_payload')->nullable(); // sanitized/allowed fields
            $table->json('provider_metadata')->nullable(); // non-secret

            $table->timestamps();

            $table->unique(['organization_id', 'idempotency_key', 'provider'], 'payments_txn_idempotency_unique');
        });

        Schema::create('payment_provider_events', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('user_id')->index()->nullable();

            $table->string('provider', 32)->index();
            $table->string('event_type', 128)->index();
            $table->string('provider_event_id', 128)->unique()->index(); // Razorpay event id (or derived unique)

            // Correlation
            $table->string('provider_order_id', 128)->nullable()->index();
            $table->string('provider_payment_id', 128)->nullable()->index();
            $table->string('provider_signature', 256)->nullable(); // stored for audit/debug (no secrets)

            $table->json('payload')->nullable(); // store non-secret subset
            $table->string('status', 64)->index(); // RECEIVED, PROCESSED, FAILED, IGNORED

            $table->text('failure_reason')->nullable();

            $table->timestamps();

            $table->index(['provider', 'provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_provider_events');
        Schema::dropIfExists('payment_transactions');
    }
};
