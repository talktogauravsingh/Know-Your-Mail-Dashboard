<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AuthPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 0. Fallback: If no users exist (e.g., Supabase connection failed), seed default users & organization
        if (User::count() === 0) {
            // Seed RBAC legacy roles first
            if (!\App\Models\Role::where('slug', 'root')->exists()) {
                \App\Models\Role::create(['name' => 'Root', 'slug' => 'root']);
            }
            if (!\App\Models\Role::where('slug', 'super-admin')->exists()) {
                \App\Models\Role::create(['name' => 'Super Admin', 'slug' => 'super-admin']);
            }
            if (!\App\Models\Role::where('slug', 'admin')->exists()) {
                \App\Models\Role::create(['name' => 'Admin', 'slug' => 'admin']);
            }
            if (!\App\Models\Role::where('slug', 'manager')->exists()) {
                \App\Models\Role::create(['name' => 'Manager', 'slug' => 'manager']);
            }
            if (!\App\Models\Role::where('slug', 'user')->exists()) {
                \App\Models\Role::create(['name' => 'User', 'slug' => 'user']);
            }

            $organization = \App\Models\Organization::firstOrCreate(
                ['name' => 'Test Organization'],
                ['name' => 'Test Organization']
            );

            $superAdminRole = \App\Models\Role::where('slug', 'super-admin')->first();
            $managerRole = \App\Models\Role::where('slug', 'manager')->first();
            $userRole = \App\Models\Role::where('slug', 'user')->first();

            $rootLegacyRole = \App\Models\Role::where('slug', 'root')->first();

            User::create([
                'name' => 'Shravani testone',
                'email' => 'techknowyourmail@gmail.com',
                'password' => bcrypt('Shivam@rs1'),
                'role_id' => $rootLegacyRole?->id ?? $superAdminRole?->id,
                'organization_id' => $organization->id,
            ]);

            User::create([
                'name' => 'Test Manager',
                'email' => 'manager@example.com',
                'password' => bcrypt('password'),
                'role_id' => $managerRole?->id,
                'organization_id' => $organization->id,
            ]);

            User::create([
                'name' => 'Test Agent',
                'email' => 'agent@example.com',
                'password' => bcrypt('password'),
                'role_id' => $userRole?->id,
                'organization_id' => $organization->id,
            ]);

            User::create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => bcrypt('password'),
                'role_id' => $superAdminRole?->id,
                'organization_id' => $organization->id,
            ]);
        }

        // 1. Seed pages using defined page constants
        $pages = [
            AUTH_PAGE_OVERVIEW => 'Overview',
            AUTH_PAGE_BILLING => 'Billing & Plan',
            AUTH_PAGE_CAMPAIGNS => 'Campaigns',
            AUTH_PAGE_TEMPLATES => 'Templates',
            AUTH_PAGE_AUTOMATION => 'Automation',
            AUTH_PAGE_AUDIENCE => 'Audience',
            AUTH_PAGE_GLOBAL_IMPORT => 'Global Import',
            AUTH_PAGE_SETTINGS => 'Settings',
            AUTH_PAGE_FOUNDER_CONSOLE => 'Founder Console',
        ];

        foreach ($pages as $id => $name) {
            DB::table('auth_pages')->updateOrInsert(
                ['id' => $id],
                ['name' => $name, 'status' => 1]
            );
        }

        // 2. Seed actions using defined action constants
        $actions = [
            AUTH_ACTION_ALL => 'all',
            AUTH_ACTION_VIEW => 'view',
            AUTH_ACTION_CREATE => 'create',
            AUTH_ACTION_EDIT => 'edit',
            AUTH_ACTION_DELETE => 'delete',
        ];

        foreach ($actions as $id => $name) {
            DB::table('auth_actions')->updateOrInsert(
                ['id' => $id],
                ['name' => $name]
            );
        }

        // 3. Map pages to actions in auth_page_actions
        $pageActionsList = [];
        foreach (array_keys($pages) as $pageId) {
            foreach (array_keys($actions) as $actionId) {
                // Determine page action description
                $pageName = $pages[$pageId];
                $actionName = $actions[$actionId];
                $description = "Ability to {$actionName} {$pageName}";

                // Insert/update page action
                DB::table('auth_page_actions')->updateOrInsert(
                    [
                        'page_id' => $pageId,
                        'action_id' => $actionId,
                    ],
                    [
                        'description' => $description,
                        'status' => 1,
                    ]
                );
            }
        }

        // Get the creator ID (default to first user or user ID 1)
        $creator = User::first();
        $creatorId = $creator ? $creator->id : 1;

        // 4. Seed roles
        $roles = [
            1 => [
                'name' => 'root',
                'description' => 'System Root Role - full control',
                'parent_id' => 0,
                'status' => 1,
                'type' => 0,
                'created_by' => $creatorId,
            ],
            2 => [
                'name' => 'admin',
                'description' => 'Administrator Role - full permissions',
                'parent_id' => 0,
                'status' => 1,
                'type' => 0,
                'created_by' => $creatorId,
            ],
            3 => [
                'name' => 'manager',
                'description' => 'Manager Role - manage campaigns, templates, automation and audience',
                'parent_id' => 2,
                'status' => 1,
                'type' => 0,
                'created_by' => $creatorId,
            ],
            4 => [
                'name' => 'user',
                'description' => 'Regular User Role - view only access to campaigns and templates',
                'parent_id' => 3,
                'status' => 1,
                'type' => 0,
                'created_by' => $creatorId,
            ],
        ];

        foreach ($roles as $id => $data) {
            DB::table('auth_roles')->updateOrInsert(
                ['id' => $id],
                $data
            );
        }

        // 5. Map role permissions (page action mappings)
        // Root (ID 1) needs no explicit mappings since the checks handle isRoot=1, but let's seed anyway for safety.
        // Let's get page action IDs
        $pageActions = DB::table('auth_page_actions')->get();

        // Root & Admin roles (ID 1 & 2) get all page actions
        foreach ([1, 2] as $roleId) {
            foreach ($pageActions as $pa) {
                DB::table('auth_role_page_actions')->updateOrInsert(
                    [
                        'role_id' => $roleId,
                        'page_action_id' => $pa->id,
                    ],
                    ['access' => 1]
                );
            }
        }

        // Manager role (ID 3) gets access to Campaigns, Templates, Automation, Audience, Overview, Billing
        $managerAllowedPages = [
            AUTH_PAGE_OVERVIEW,
            AUTH_PAGE_BILLING,
            AUTH_PAGE_CAMPAIGNS,
            AUTH_PAGE_TEMPLATES,
            AUTH_PAGE_AUTOMATION,
            AUTH_PAGE_AUDIENCE,
        ];

        foreach ($pageActions as $pa) {
            if (in_array($pa->page_id, $managerAllowedPages)) {
                DB::table('auth_role_page_actions')->updateOrInsert(
                    [
                        'role_id' => 3,
                        'page_action_id' => $pa->id,
                    ],
                    ['access' => 1]
                );
            }
        }

        // User role (ID 4) gets view-only access to Overview, Campaigns, Templates
        $userAllowedPageActions = $pageActions->filter(function ($pa) {
            return in_array($pa->page_id, [AUTH_PAGE_OVERVIEW, AUTH_PAGE_CAMPAIGNS, AUTH_PAGE_TEMPLATES])
                && $pa->action_id === AUTH_ACTION_VIEW;
        });

        foreach ($userAllowedPageActions as $pa) {
            DB::table('auth_role_page_actions')->updateOrInsert(
                [
                    'role_id' => 4,
                    'page_action_id' => $pa->id,
                ],
                ['access' => 1]
            );
        }

        // 6. Map seeded users to auth roles in auth_user_roles
        $userRoleMapping = [
            'techknowyourmail@gmail.com' => 1, // root
            'manager@example.com' => 3,    // manager
            'agent@example.com' => 4,      // user
            'test@example.com' => 2,       // admin
        ];

        foreach ($userRoleMapping as $email => $roleId) {
            $userObj = User::where('email', $email)->first();
            if ($userObj) {
                DB::table('auth_user_roles')->updateOrInsert(
                    [
                        'user_id' => $userObj->id,
                        'role_id' => $roleId,
                    ],
                    [
                        'status' => 1,
                        'added_by' => $creatorId,
                    ]
                );
            }
        }

        // Always guarantee the techknowyourmail@gmail.com user exists and is root
        $orgId = DB::table('organizations')->first()->id ?? 1;
        $legacyRootRoleId = DB::table('roles')->where('slug', 'root')->value('id');
        
        DB::table('users')->updateOrInsert(
            ['email' => 'techknowyourmail@gmail.com'],
            [
                'name' => 'Shravani testone',
                'password' => bcrypt('Shivam@rs1'),
                'role_id' => $legacyRootRoleId,
                'organization_id' => $orgId,
                'must_change_password' => 0,
            ]
        );
        
        $rootUser = User::where('email', 'techknowyourmail@gmail.com')->first();
        if ($rootUser) {
            DB::table('auth_user_roles')->updateOrInsert(
                [
                    'user_id' => $rootUser->id,
                    'role_id' => 1, // root auth role
                ],
                [
                    'status' => 1,
                    'added_by' => $rootUser->id,
                ]
            );
        }
    }
}
