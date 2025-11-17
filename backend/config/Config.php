<?php

namespace Config;

class Config
{
    private static ?array $config = null;

    private function __construct() {}

    public static function get(string $key, $default = null)
    {
        if (self::$config === null) {
            self::loadConfig();
        }

        return self::$config[$key] ?? $default;
    }

    private static function loadConfig(): void
    {
        self::$config = [
            // Server
            'port' => $_ENV['PORT'] ?? 10000,
            'environment' => $_ENV['ENVIRONMENT'] ?? 'production',
            'base_url' => $_ENV['BASE_URL'] ?? '',
            'frontend_url' => $_ENV['FRONTEND_URL'] ?? '',

            // CORS
            'cors' => [
                'allowed_origins' => explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*'),
                'allowed_methods' => explode(',', $_ENV['CORS_ALLOWED_METHODS'] ?? 'GET,POST,PUT,DELETE,OPTIONS'),
                'allowed_headers' => explode(',', $_ENV['CORS_ALLOWED_HEADERS'] ?? 'Content-Type,Authorization,X-Requested-With'),
            ],

            // JWT
            'jwt_secret' => $_ENV['JWT_SECRET'] ?? 'change_this_secret',
            'session_lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 86400),

            // Upload
            'upload' => [
                'max_size' => (int)($_ENV['UPLOAD_MAX_SIZE'] ?? 5242880), // 5MB
                'allowed_extensions' => explode(',', $_ENV['UPLOAD_ALLOWED_EXTENSIONS'] ?? 'jpg,jpeg,png,webp'),
                'path' => __DIR__ . '/../../uploads/',
            ],

            // Pagination
            'pagination' => [
                'default_page_size' => (int)($_ENV['DEFAULT_PAGE_SIZE'] ?? 20),
                'max_page_size' => (int)($_ENV['MAX_PAGE_SIZE'] ?? 100),
            ],

            // Logging
            'log_level' => $_ENV['LOG_LEVEL'] ?? 'error',
            'log_path' => $_ENV['LOG_PATH'] ?? '/var/log/muta',
        ];
    }

    public static function isProduction(): bool
    {
        return self::get('environment') === 'production';
    }

    public static function isDevelopment(): bool
    {
        return self::get('environment') === 'development';
    }
}
