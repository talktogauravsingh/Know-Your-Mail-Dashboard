<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use PDO;

class SupabaseDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $host = 'aws-1-ap-northeast-2.pooler.supabase.com';
        $port = 5432;
        $db = 'postgres';
        $user = 'postgres.dtlisdqyoticllzhufju';
        $pass = 'yUYYZYf3152uZyPa';

        $this->command->info("Connecting to Supabase PostgreSQL database...");

        try {
            $dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";
            $supabasePdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->command->info("Successfully connected to Supabase!");
        } catch (\PDOException $e) {
            $this->command->error("Failed to connect to Supabase: " . $e->getMessage());
            return;
        }

        // Dynamically get all tables in local MySQL database
        $rawTables = DB::select('SHOW TABLES');
        $tables = [];
        foreach ($rawTables as $rawTable) {
            $tableArray = (array) $rawTable;
            $tableName = reset($tableArray);
            
            // Skip framework-internal tables
            if (in_array($tableName, ['migrations', 'sessions', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'])) {
                continue;
            }
            $tables[] = $tableName;
        }

        // Disable Foreign Key Checks in MySQL
        $this->command->info("Disabling MySQL foreign key checks...");
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        foreach ($tables as $table) {
            $this->command->info("Processing table: {$table}");

            // 1. Check if table exists in Supabase PostgreSQL
            try {
                $supabasePdo->query("SELECT 1 FROM \"{$table}\" LIMIT 1");
            } catch (\Exception $e) {
                $this->command->warn("Table '{$table}' does not exist in Supabase database. Skipping...");
                continue;
            }

            // 2. Clear existing local data in MySQL table
            DB::table($table)->truncate();

            // 3. Fetch data from Supabase
            try {
                $stmt = $supabasePdo->query("SELECT * FROM \"{$table}\"");
                $rows = $stmt->fetchAll();

                $count = count($rows);
                $this->command->info("Found {$count} rows in Supabase table '{$table}'.");

                if ($count === 0) {
                    continue;
                }

                // Get local columns to filter out target-mismatched columns
                $localColumns = Schema::getColumnListing($table);
                $columnsMap = array_flip($localColumns);

                // 4. Chunk and Insert rows into local MySQL
                $chunks = array_chunk($rows, 100);
                foreach ($chunks as $chunk) {
                    // Normalize types and filter keys if needed
                    $normalizedChunk = array_map(function ($row) use ($columnsMap) {
                        // Filter out keys that do not exist in the local table schema
                        $filteredRow = array_intersect_key($row, $columnsMap);

                        return array_map(function ($value) {
                            // PHP PDO fetches pgsql bools as true/false booleans or strings. 
                            // Convert boolean values to 1/0 for MySQL.
                            if (is_bool($value)) {
                                return $value ? 1 : 0;
                            }
                            return $value;
                        }, $filteredRow);
                    }, $chunk);

                    DB::table($table)->insert($normalizedChunk);
                }

                $this->command->info("Successfully seeded {$count} rows into local MySQL table '{$table}'.");
            } catch (\Exception $e) {
                $this->command->error("Error migrating table {$table}: " . $e->getMessage());
            }
        }

        // Re-enable Foreign Key Checks in MySQL
        $this->command->info("Re-enabling MySQL foreign key checks...");
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->info("Data migration from Supabase to MySQL completed successfully!");
    }
}
