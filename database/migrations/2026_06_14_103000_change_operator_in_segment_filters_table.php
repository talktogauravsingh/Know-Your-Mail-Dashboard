<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // For PostgreSQL, we drop the check constraint first to prevent check violations
            DB::statement('ALTER TABLE segment_filters DROP CONSTRAINT IF EXISTS segment_filters_operator_check');
        }
        
        Schema::table('segment_filters', function (Blueprint $table) {
            $table->string('operator', 20)->default('=')->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE segment_filters ADD CONSTRAINT segment_filters_operator_check CHECK (operator::text IN ('='::text, '!='::text, 'in'::text, 'not_in'::text, 'contains'::text, 'starts_with'::text))");
        }
    }
};
