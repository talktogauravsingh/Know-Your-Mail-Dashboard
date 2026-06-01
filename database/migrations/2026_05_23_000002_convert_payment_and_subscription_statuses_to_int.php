<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (Schema::hasTable('payment_transactions') && $this->columnType('payment_transactions', 'status') !== 'integer') {
            DB::statement("
                ALTER TABLE payment_transactions
                ALTER COLUMN status TYPE integer
                USING CASE status
                    WHEN 'ORDER_PENDING' THEN 1
                    WHEN 'ORDER_CREATED' THEN 2
                    WHEN 'AUTHORIZED' THEN 3
                    WHEN 'PAID' THEN 4
                    WHEN 'FAILED' THEN 5
                    WHEN 'VERIFICATION_FAILED' THEN 6
                    ELSE NULL
                END
            ");
        }

        if (Schema::hasTable('payment_provider_events') && $this->columnType('payment_provider_events', 'status') !== 'integer') {
            DB::statement("
                ALTER TABLE payment_provider_events
                ALTER COLUMN status TYPE integer
                USING CASE status
                    WHEN 'RECEIVED' THEN 1
                    WHEN 'PROCESSING' THEN 2
                    WHEN 'PROCESSED' THEN 3
                    WHEN 'FAILED' THEN 4
                    WHEN 'IGNORED' THEN 5
                    ELSE NULL
                END
            ");
        }

        if (Schema::hasTable('organization_subscriptions') && $this->columnType('organization_subscriptions', 'status') !== 'integer') {
            DB::statement("
                ALTER TABLE organization_subscriptions
                ALTER COLUMN status TYPE integer
                USING CASE status
                    WHEN 'trial' THEN 1
                    WHEN 'active' THEN 2
                    WHEN 'past_due' THEN 3
                    WHEN 'cancelled' THEN 4
                    WHEN 'expired' THEN 5
                    ELSE NULL
                END
            ");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (Schema::hasTable('payment_transactions') && $this->columnType('payment_transactions', 'status') === 'integer') {
            DB::statement("
                ALTER TABLE payment_transactions
                ALTER COLUMN status TYPE varchar(64)
                USING CASE status
                    WHEN 1 THEN 'ORDER_PENDING'
                    WHEN 2 THEN 'ORDER_CREATED'
                    WHEN 3 THEN 'AUTHORIZED'
                    WHEN 4 THEN 'PAID'
                    WHEN 5 THEN 'FAILED'
                    WHEN 6 THEN 'VERIFICATION_FAILED'
                    ELSE NULL
                END
            ");
        }

        if (Schema::hasTable('payment_provider_events') && $this->columnType('payment_provider_events', 'status') === 'integer') {
            DB::statement("
                ALTER TABLE payment_provider_events
                ALTER COLUMN status TYPE varchar(64)
                USING CASE status
                    WHEN 1 THEN 'RECEIVED'
                    WHEN 2 THEN 'PROCESSING'
                    WHEN 3 THEN 'PROCESSED'
                    WHEN 4 THEN 'FAILED'
                    WHEN 5 THEN 'IGNORED'
                    ELSE NULL
                END
            ");
        }

        if (Schema::hasTable('organization_subscriptions') && $this->columnType('organization_subscriptions', 'status') === 'integer') {
            DB::statement("
                ALTER TABLE organization_subscriptions
                ALTER COLUMN status TYPE varchar(64)
                USING CASE status
                    WHEN 1 THEN 'trial'
                    WHEN 2 THEN 'active'
                    WHEN 3 THEN 'past_due'
                    WHEN 4 THEN 'cancelled'
                    WHEN 5 THEN 'expired'
                    ELSE NULL
                END
            ");
        }
    }

    private function columnType(string $table, string $column): ?string
    {
        $result = DB::selectOne(
            'select data_type from information_schema.columns where table_name = ? and column_name = ? limit 1',
            [$table, $column],
        );

        return $result?->data_type ?? null;
    }
};
