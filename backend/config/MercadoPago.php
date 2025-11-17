<?php

namespace Config;

class MercadoPago
{
    private static ?array $config = null;

    private function __construct() {}

    public static function getConfig(): array
    {
        if (self::$config === null) {
            self::$config = [
                'access_token' => $_ENV['MP_ACCESS_TOKEN'] ?? '',
                'public_key' => $_ENV['MP_PUBLIC_KEY'] ?? '',
                'webhook_secret' => $_ENV['MP_WEBHOOK_SECRET'] ?? '',
                'sandbox_mode' => filter_var(
                    $_ENV['MP_SANDBOX_MODE'] ?? 'true',
                    FILTER_VALIDATE_BOOLEAN
                ),
                'success_url' => $_ENV['SUCCESS_URL'] ?? $_ENV['FRONTEND_URL'] . '/payment-success.html',
                'failure_url' => $_ENV['FAILURE_URL'] ?? $_ENV['FRONTEND_URL'] . '/payment-failure.html',
                'pending_url' => $_ENV['PENDING_URL'] ?? $_ENV['FRONTEND_URL'] . '/payment-pending.html',
            ];
        }

        return self::$config;
    }

    public static function getAccessToken(): string
    {
        return self::getConfig()['access_token'];
    }

    public static function getPublicKey(): string
    {
        return self::getConfig()['public_key'];
    }

    public static function isSandbox(): bool
    {
        return self::getConfig()['sandbox_mode'];
    }
}
