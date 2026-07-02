<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
                if (DB::getDriverName() === 'mysql') {
                    Schema::table('recipients', function (Blueprint $table) use ($column) {
                        $table->string($column, 100)->nullable()->change();
                    });
                } else {
                    DB::statement("ALTER TABLE recipients ALTER COLUMN {$column} DROP NOT NULL");
                }
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
                DB::table('recipients')->whereNull($column)->update([$column => '']);
                if (DB::getDriverName() === 'mysql') {
                    Schema::table('recipients', function (Blueprint $table) use ($column) {
                        $table->string($column, 100)->nullable(false)->change();
                    });
                } else {
                    DB::statement("ALTER TABLE recipients ALTER COLUMN {$column} SET NOT NULL");
                }
            }
        }
    }
};
