<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemConfig extends Model
{
    protected $table = 'system_configs';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    public const CACHE_KEY = 'system_configs_all_cache';

    /**
     * Retrieve all configurations as an associative array [key => value], cached.
     */
    public static function allCached(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            try {
                return self::query()->pluck('value', 'key')->all();
            } catch (\Throwable $e) {
                return [];
            }
        });
    }

    /**
     * Get a configuration value by key, falling back to .env or default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $key = strtoupper($key);
        $configs = self::allCached();

        if (array_key_exists($key, $configs) && $configs[$key] !== null && $configs[$key] !== '') {
            return $configs[$key];
        }

        return env($key, $default);
    }

    /**
     * Set a configuration value and refresh the cache.
     */
    public static function set(string $key, mixed $value, ?string $description = null): self
    {
        $key = strtoupper($key);
        $data = ['value' => (string) $value];
        if ($description !== null) {
            $data['description'] = $description;
        }

        $config = self::updateOrCreate(['key' => $key], $data);
        self::clearCache();

        return $config;
    }

    /**
     * Clear the cached system configurations.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
        // Also forget legacy founder config cache key if present
        Cache::forget('founder_system_configs');
    }
}
