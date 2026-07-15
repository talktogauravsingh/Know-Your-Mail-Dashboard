<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("SET FOREIGN_KEY_CHECKS = 0;");
        DB::statement("DROP TABLE IF EXISTS auth_user_roles;");
        DB::statement("DROP TABLE IF EXISTS auth_role_page_actions;");
        DB::statement("DROP TABLE IF EXISTS auth_roles;");
        DB::statement("DROP TABLE IF EXISTS auth_page_actions;");
        DB::statement("DROP TABLE IF EXISTS auth_actions;");
        DB::statement("DROP TABLE IF EXISTS auth_pages;");
        DB::statement("SET FOREIGN_KEY_CHECKS = 1;");

        // 1. auth_pages
        DB::statement("
            CREATE TABLE auth_pages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL COMMENT 'Page Name',
                status INT NOT NULL DEFAULT 1 COMMENT 'Page Status',
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation datetime',
                modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Modified timestamp'
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");

        // 2. auth_actions
        DB::statement("
            CREATE TABLE auth_actions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");

        // 3. auth_page_actions
        DB::statement("
            CREATE TABLE auth_page_actions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                page_id INT NOT NULL COMMENT 'auth page id',
                action_id INT NOT NULL COMMENT 'auth action id',
                description TEXT NOT NULL COMMENT 'Description',
                status SMALLINT NOT NULL DEFAULT 1,
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation datetime',
                modified DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (page_id) REFERENCES auth_pages(id) ON DELETE CASCADE,
                FOREIGN KEY (action_id) REFERENCES auth_actions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");

        // 4. auth_roles
        DB::statement("
            CREATE TABLE auth_roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL COMMENT 'Role\'s name',
                description TEXT NOT NULL COMMENT 'Role\'s description',
                parent_id INT NOT NULL DEFAULT 0 COMMENT 'Parent role id',
                status INT NOT NULL DEFAULT 1 COMMENT 'Role status',
                type INT NOT NULL DEFAULT 0 COMMENT '0 => Default, 1 => Partner',
                created_by BIGINT UNSIGNED NOT NULL COMMENT 'Roles Created By',
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");

        // 5. auth_role_page_actions
        DB::statement("
            CREATE TABLE auth_role_page_actions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL COMMENT 'Role Id',
                page_action_id INT NOT NULL COMMENT 'Page action Id',
                access INT NOT NULL DEFAULT 1,
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                modified TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE,
                FOREIGN KEY (page_action_id) REFERENCES auth_page_actions(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");

        // 6. auth_user_roles
        DB::statement("
            CREATE TABLE auth_user_roles (
                id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Id',
                user_id BIGINT UNSIGNED NOT NULL COMMENT 'User Id',
                role_id INT NOT NULL COMMENT 'Role Id',
                status SMALLINT NOT NULL,
                added_by BIGINT UNSIGNED NOT NULL COMMENT 'User given permission',
                created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Created',
                updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES auth_roles(id) ON DELETE CASCADE,
                FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('auth_user_roles');
        Schema::dropIfExists('auth_role_page_actions');
        Schema::dropIfExists('auth_roles');
        Schema::dropIfExists('auth_page_actions');
        Schema::dropIfExists('auth_actions');
        Schema::dropIfExists('auth_pages');
    }
};
