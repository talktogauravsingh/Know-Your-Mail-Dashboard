<?php

namespace Database\Seeders;

use App\Models\SystemConfig;
use Illuminate\Database\Seeder;

class SystemConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaults = [
            'APP_NAME' => ['value' => env('APP_NAME', 'Know Your Mail'), 'description' => 'Application display name'],
            'APP_ENV' => ['value' => env('APP_ENV', 'local'), 'description' => 'Application environment (local, qa, production)'],
            'APP_URL' => ['value' => env('APP_URL', 'http://localhost'), 'description' => 'Main application URL'],
            'TRACKING_BASE_URL' => ['value' => env('TRACKING_BASE_URL', 'http://localhost'), 'description' => 'Base URL used for email open/click tracking links'],
            'TRACKING_DOMAIN' => ['value' => env('TRACKING_DOMAIN', 'knowyourmail.in'), 'description' => 'Default tracking domain'],
            'TRACKING_HOST' => ['value' => env('TRACKING_HOST', 'http://127.0.0.1:3001'), 'description' => 'Fastify tracker host URL for Haraka worker'],
            'LARAVEL_INTERNAL_URL' => ['value' => env('LARAVEL_INTERNAL_URL', 'http://127.0.0.1:8000'), 'description' => 'Internal Laravel backend URL accessible from Haraka worker'],
            'MAILGUN_API_KEY' => ['value' => env('MAILGUN_API_KEY', ''), 'description' => 'Mailgun service API key'],
            'MAILGUN_DOMAIN' => ['value' => env('MAILGUN_DOMAIN', 'knowyourmail.in'), 'description' => 'Mailgun sending domain'],
            'ENCRYPTION_KEY' => ['value' => env('ENCRYPTION_KEY', 'kym_encryption_secret_key_32_bytes_long_key_!'), 'description' => 'Shared secret key for DKIM / domain verification payload encryption'],
            'GEMINI_API_KEY' => ['value' => env('GEMINI_API_KEY', ''), 'description' => 'Google Gemini AI API key'],
            'VITE_KYM_API_URL' => ['value' => env('VITE_KYM_API_URL', 'http://localhost/api'), 'description' => 'Frontend API base URL'],
            'LOG_LEVEL' => ['value' => env('LOG_LEVEL', 'debug'), 'description' => 'System logging level'],
        ];

        foreach ($defaults as $key => $data) {
            if (!SystemConfig::where('key', $key)->exists()) {
                SystemConfig::create([
                    'key' => $key,
                    'value' => $data['value'],
                    'description' => $data['description'],
                ]);
            }
        }

        SystemConfig::clearCache();
    }
}
