<?php

namespace Middleware;

use Repositories\UserRepository;
use Utils\Response;

class AuthMiddleware
{
    private static UserRepository $userRepo;

    public static function handle(): ?array
    {
        self::$userRepo = new UserRepository();

        // Check for session or token
        session_start();

        if (isset($_SESSION['user_id'])) {
            $user = self::$userRepo->findById($_SESSION['user_id']);

            if ($user && $user->isActive()) {
                return $user->toArray();
            }
        }

        // Check for Bearer token
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $token = str_replace('Bearer ', '', $headers['Authorization']);
            // Implement token validation here
            // For now, we'll just return null
        }

        Response::unauthorized('No autenticado');
        return null;
    }

    public static function requireAuth(): array
    {
        $user = self::handle();
        if (!$user) {
            Response::unauthorized('Autenticación requerida');
            exit;
        }
        return $user;
    }

    public static function requireAdmin(): array
    {
        $user = self::requireAuth();
        if ($user['rol'] !== 'admin') {
            Response::forbidden('Se requieren permisos de administrador');
            exit;
        }
        return $user;
    }

    public static function getOptionalUser(): ?array
    {
        session_start();

        if (isset($_SESSION['user_id'])) {
            self::$userRepo = new UserRepository();
            $user = self::$userRepo->findById($_SESSION['user_id']);

            if ($user && $user->isActive()) {
                return $user->toArray();
            }
        }

        return null;
    }
}
