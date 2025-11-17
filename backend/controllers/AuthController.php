<?php

namespace Controllers;

use Repositories\UserRepository;
use Models\User;
use Utils\Response;
use Utils\Validator;

class AuthController
{
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
    }

    // POST /api/auth/register
    public function register(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $validator = new Validator();
            $validator->required($data['nombre'] ?? '', 'nombre')
                      ->required($data['email'] ?? '', 'email')
                      ->email($data['email'] ?? '', 'email')
                      ->required($data['password'] ?? '', 'password')
                      ->min($data['password'] ?? '', 6, 'password');

            if (!$validator->isValid()) {
                Response::badRequest('Errores de validación', $validator->getErrors());
                return;
            }

            if ($this->userRepo->findByEmail($data['email'])) {
                Response::badRequest('El email ya está registrado');
                return;
            }

            $user = new User($data);
            $user->setPassword($data['password']);
            $user->rol = 'cliente';
            $user->estado = 'Activo';

            $id = $this->userRepo->create($user);
            $user->id = $id;

            session_start();
            $_SESSION['user_id'] = $id;

            Response::created(['user' => $user->toArray()]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/auth/login
    public function login(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $validator = new Validator();
            $validator->required($data['email'] ?? '', 'email')
                      ->email($data['email'] ?? '', 'email')
                      ->required($data['password'] ?? '', 'password');

            if (!$validator->isValid()) {
                Response::badRequest('Errores de validación', $validator->getErrors());
                return;
            }

            $user = $this->userRepo->findByEmail($data['email']);

            if (!$user || !$user->verifyPassword($data['password'])) {
                Response::unauthorized('Credenciales inválidas');
                return;
            }

            if (!$user->isActive()) {
                Response::forbidden('Tu cuenta está inactiva');
                return;
            }

            session_start();
            $_SESSION['user_id'] = $user->id;

            Response::success(['user' => $user->toArray()]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/auth/logout
    public function logout(): void
    {
        session_start();
        session_destroy();
        Response::success(['message' => 'Sesión cerrada correctamente']);
    }

    // POST /api/auth/forgot-password
    public function forgotPassword(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $user = $this->userRepo->findByEmail($data['email'] ?? '');

            if (!$user) {
                Response::success(['message' => 'Si el email existe, recibirás instrucciones']);
                return;
            }

            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            $this->userRepo->updateResetToken($user->id, $token, $expiresAt);

            // TODO: Send email with reset link
            // For now, just return success
            Response::success(['message' => 'Si el email existe, recibirás instrucciones']);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/auth/reset-password
    public function resetPassword(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $validator = new Validator();
            $validator->required($data['token'] ?? '', 'token')
                      ->required($data['password'] ?? '', 'password')
                      ->min($data['password'] ?? '', 6, 'password');

            if (!$validator->isValid()) {
                Response::badRequest('Errores de validación', $validator->getErrors());
                return;
            }

            $user = $this->userRepo->findByResetToken($data['token']);

            if (!$user) {
                Response::badRequest('Token inválido o expirado');
                return;
            }

            $user->setPassword($data['password']);
            $this->userRepo->updatePassword($user->id, $user->password_hash);
            $this->userRepo->updateResetToken($user->id, null, null);

            Response::success(['message' => 'Contraseña restablecida correctamente']);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }
}
