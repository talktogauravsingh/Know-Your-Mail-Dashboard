<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('send_logs', 'recipient_id')) {
                $table->unsignedBigInteger('recipient_id')->nullable();
            }
            if (!Schema::hasColumn('send_logs', 'variant_id')) {
                $table->unsignedBigInteger('variant_id')->nullable();
            }
            if (!Schema::hasColumn('send_logs', 'status')) {
                $table->enum('status', ['pending','sent','failed','opened','clicked'])
                      ->default('pending');
            }
            if (!Schema::hasColumn('send_logs', 'provider_message_id')) {
                $table->string('provider_message_id')->nullable();
            }
            if (!Schema::hasColumn('send_logs', 'sent_at')) {
                $table->timestamp('sent_at')->nullable();
            }
            if (!Schema::hasColumn('send_logs', 'clicked_at')) {
                $table->timestamp('clicked_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('send_logs', function (Blueprint $table) {

            if (Schema::hasColumn('send_logs', 'campaign_id')) {
                $table->dropIndex('idx_send_campaign');
                $table->dropColumn('campaign_id');
            }

            if (Schema::hasColumn('send_logs', 'recipient_id')) {
                $table->dropIndex('idx_send_recipient');
                $table->dropColumn('recipient_id');
            }

            $table->dropColumn([
                'variant_id',
                'status',
                'provider_message_id',
                'sent_at',
                'opened_at',
                'clicked_at'
            ]);
        });
    }
};