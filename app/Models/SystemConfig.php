<?php

namespace App\Models;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class SystemConfig
{
    public const REDIS_PREFIX = 'kym:config:';
    public const REDIS_META_HASH = 'kym:configs:meta';

    /**
     * Get a configuration value by key from Redis Cloud, with fallback to env().
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $upperKey = strtoupper($key);
        try {
            $val = Redis::get(self::REDIS_PREFIX . $upperKey);
            if ($val !== null && $val !== '') {
                return $val;
            }
        } catch (\Throwable $e) {
            Log::error("Error reading config key {$upperKey} from Redis Cloud: " . $e->getMessage());
        }

        return env($key, $default);
    }

    /**
     * Set a configuration value in Redis Cloud.
     */
    public static function set(string $key, mixed $value, ?string $description = null): void
    {
        $upperKey = strtoupper($key);
        $valStr = (string) $value;

        try {
            // Save raw key for fast single-key lookup
            Redis::set(self::REDIS_PREFIX . $upperKey, $valStr);

            // Save meta object in Redis Hash for admin listing
            $metaData = [
                'key' => $upperKey,
                'value' => $valStr,
                'description' => $description ?? '',
                'updated_at' => now()->toIso8601String(),
            ];
            Redis::hset(self::REDIS_META_HASH, $upperKey, json_encode($metaData));
        } catch (\Throwable $e) {
            Log::error("Error setting config key {$upperKey} in Redis Cloud: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a configuration key from Redis Cloud.
     */
    public static function deleteConfig(string $key): bool
    {
        $upperKey = strtoupper($key);
        try {
            Redis::del(self::REDIS_PREFIX . $upperKey);
            $deleted = Redis::hdel(self::REDIS_META_HASH, $upperKey);
            return $deleted > 0;
        } catch (\Throwable $e) {
            Log::error("Error deleting config key {$upperKey} from Redis Cloud: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Retrieve all stored configuration records from Redis Cloud.
     */
    public static function all(): array
    {
        try {
            $rawList = Redis::hgetall(self::REDIS_META_HASH);
            $results = [];
            foreach ($rawList as $key => $jsonStr) {
                $decoded = json_decode($jsonStr, true);
                if (is_array($decoded)) {
                    $results[] = $decoded;
                }
            }
            return $results;
        } catch (\Throwable $e) {
            Log::error("Error fetching all configs from Redis Cloud: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Clear cached system configuration.
     */
    public static function clearCache(): void
    {
        // No-op for Redis Cloud since data is read live from Redis Cloud
    }
}
