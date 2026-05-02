<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedBigInteger('recipient_id')->nullable();
            $table->unsignedBigInteger('variant_id')->nullable();

            $table->enum('status', ['pending','sent','failed','opened','clicked'])
                  ->default('pending');

            $table->string('provider_message_id')->nullable();

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('clicked_at')->nullable();

            $table->index('campaign_id', 'idx_send_campaign');
            $table->index('recipient_id', 'idx_send_recipient');
        });
    }

    public function down(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {
            $table->dropColumn([
                'campaign_id',
                'recipient_id',
                'variant_id',
                'status',
                'provider_message_id',
                'sent_at',
                'opened_at',
                'clicked_at'
            ]);

            $table->dropIndex('idx_send_campaign');
            $table->dropIndex('idx_send_recipient');
        });
    }
};