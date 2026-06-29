<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
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
        } elseif ($driver === 'mysql') {
            if (Schema::hasTable('payment_transactions') && !in_array($this->columnType('payment_transactions', 'status'), ['int', 'integer'])) {
                $mapping = [
                    'ORDER_PENDING' => 1,
                    'ORDER_CREATED' => 2,
                    'AUTHORIZED' => 3,
                    'PAID' => 4,
                    'FAILED' => 5,
                    'VERIFICATION_FAILED' => 6,
                ];
                foreach ($mapping as $strVal => $intVal) {
                    DB::table('payment_transactions')->where('status', $strVal)->update(['status' => $intVal]);
                }
                Schema::table('payment_transactions', function (Blueprint $table) {
                    $table->integer('status')->change();
                });
            }

            if (Schema::hasTable('payment_provider_events') && !in_array($this->columnType('payment_provider_events', 'status'), ['int', 'integer'])) {
                $mapping = [
                    'RECEIVED' => 1,
                    'PROCESSING' => 2,
                    'PROCESSED' => 3,
                    'FAILED' => 4,
                    'IGNORED' => 5,
                ];
                foreach ($mapping as $strVal => $intVal) {
                    DB::table('payment_provider_events')->where('status', $strVal)->update(['status' => $intVal]);
                }
                Schema::table('payment_provider_events', function (Blueprint $table) {
                    $table->integer('status')->change();
                });
            }

            if (Schema::hasTable('organization_subscriptions') && !in_array($this->columnType('organization_subscriptions', 'status'), ['int', 'integer'])) {
                $mapping = [
                    'trial' => 1,
                    'active' => 2,
                    'past_due' => 3,
                    'cancelled' => 4,
                    'expired' => 5,
                ];
                foreach ($mapping as $strVal => $intVal) {
                    DB::table('organization_subscriptions')->where('status', $strVal)->update(['status' => $intVal]);
                }
                Schema::table('organization_subscriptions', function (Blueprint $table) {
                    $table->integer('status')->change();
                });
            }
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
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
        } elseif ($driver === 'mysql') {
            if (Schema::hasTable('payment_transactions') && in_array($this->columnType('payment_transactions', 'status'), ['int', 'integer'])) {
                Schema::table('payment_transactions', function (Blueprint $table) {
                    $table->string('status', 64)->change();
                });
                $mapping = [
                    1 => 'ORDER_PENDING',
                    2 => 'ORDER_CREATED',
                    3 => 'AUTHORIZED',
                    4 => 'PAID',
                    5 => 'FAILED',
                    6 => 'VERIFICATION_FAILED',
                ];
                foreach ($mapping as $intVal => $strVal) {
                    DB::table('payment_transactions')->where('status', $intVal)->update(['status' => $strVal]);
                }
            }

            if (Schema::hasTable('payment_provider_events') && in_array($this->columnType('payment_provider_events', 'status'), ['int', 'integer'])) {
                Schema::table('payment_provider_events', function (Blueprint $table) {
                    $table->string('status', 64)->change();
                });
                $mapping = [
                    1 => 'RECEIVED',
                    2 => 'PROCESSING',
                    3 => 'PROCESSED',
                    4 => 'FAILED',
                    5 => 'IGNORED',
                ];
                foreach ($mapping as $intVal => $strVal) {
                    DB::table('payment_provider_events')->where('status', $intVal)->update(['status' => $strVal]);
                }
            }

            if (Schema::hasTable('organization_subscriptions') && in_array($this->columnType('organization_subscriptions', 'status'), ['int', 'integer'])) {
                Schema::table('organization_subscriptions', function (Blueprint $table) {
                    $table->string('status', 64)->change();
                });
                $mapping = [
                    1 => 'trial',
                    2 => 'active',
                    3 => 'past_due',
                    4 => 'cancelled',
                    5 => 'expired',
                ];
                foreach ($mapping as $intVal => $strVal) {
                    DB::table('organization_subscriptions')->where('status', $intVal)->update(['status' => $strVal]);
                }
            }
        }
    }

    private function columnType(string $table, string $column): ?string
    {
        try {
            return Schema::getColumnType($table, $column);
        } catch (\Throwable $e) {
            return null;
        }
    }
};
