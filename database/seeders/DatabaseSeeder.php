<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Fetch and migrate all domain tables from Supabase Postgres
        $this->call(SupabaseDataSeeder::class);

        // 2. Seed pages, actions, roles, and map user roles
        $this->call(AuthPermissionSeeder::class);
    }
}
