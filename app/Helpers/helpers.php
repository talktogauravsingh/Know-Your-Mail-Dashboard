<?php

use App\Models\SystemConfig;

if (!function_exists('system_config')) {
    /**
     * Helper to retrieve database system configuration with fallback.
     */
    function system_config(string $key, mixed $default = null): mixed
    {
        return SystemConfig::get($key, $default);
    }
}
