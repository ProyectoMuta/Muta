<?php

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Autoloader
require_once __DIR__ . '/autoload.php';

// Load Composer autoloader for dependencies
if (file_exists(__DIR__ . '/../backend_old/vendor/autoload.php')) {
    require_once __DIR__ . '/../backend_old/vendor/autoload.php';
}

// CORS Middleware
use Middleware\CorsMiddleware;
CorsMiddleware::handle();

// Load routes
require_once __DIR__ . '/routes/api.php';
