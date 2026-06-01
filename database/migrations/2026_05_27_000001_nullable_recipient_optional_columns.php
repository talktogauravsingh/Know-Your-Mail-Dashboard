<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        foreach (['lead_type', 'city', 'gender'] as $column) {
            if (Schema::hasColumn('recipients', $column)) {
                DB::statement("ALTER TABLE recipients ALTER COLUMN {$column} DROP NOT NULL");
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        foreach (['lead_type', 'city', 'gender'] as $column) {
            if (Schema::hasColumn('recipients', $column)) {
                DB::statement("UPDATE recipients SET {$column} = '' WHERE {$column} IS NULL");
                DB::statement("ALTER TABLE recipients ALTER COLUMN {$column} SET NOT NULL");
            }
        }
    }
};
