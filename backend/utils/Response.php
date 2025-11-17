<?php

namespace Utils;

class Response
{
    public static function json($data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success($data = null, string $message = 'Success', int $statusCode = 200): void
    {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }

    public static function error(string $message = 'Error', int $statusCode = 400, $errors = null): void
    {
        self::json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $statusCode);
    }

    public static function created($data = null, string $message = 'Resource created successfully'): void
    {
        self::success($data, $message, 201);
    }

    public static function updated($data = null, string $message = 'Resource updated successfully'): void
    {
        self::success($data, $message, 200);
    }

    public static function deleted(string $message = 'Resource deleted successfully'): void
    {
        self::success(null, $message, 200);
    }

    public static function notFound(string $message = 'Resource not found'): void
    {
        self::error($message, 404);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void
    {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): void
    {
        self::error($message, 403);
    }

    public static function badRequest(string $message = 'Bad request', $errors = null): void
    {
        self::error($message, 400, $errors);
    }

    public static function serverError(string $message = 'Internal server error'): void
    {
        self::error($message, 500);
    }
}
