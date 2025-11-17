<?php

namespace Controllers;

use Repositories\UserRepository;
use Models\User;
use Utils\Response;
use Utils\Validator;
use Middleware\AuthMiddleware;

class UserController
{
    private UserRepository $userRepo;

    public function __construct()
    {
        $this->userRepo = new UserRepository();
    }

    // GET /api/users
    public function index(): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);

            $users = $this->userRepo->findAll($limit, $offset);
            $total = $this->userRepo->count();

            Response::success([
                'users' => array_map(fn($u) => $u->toArray(), $users),
                'total' => $total
            ]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // GET /api/users/:id
    public function show(string $id): void
    {
        try {
            $currentUser = AuthMiddleware::requireAuth();

            // Users can only see their own data unless admin
            if ($currentUser['id'] != $id && $currentUser['rol'] !== 'admin') {
                Response::forbidden('No tienes permiso para ver este usuario');
                return;
            }

            $user = $this->userRepo->findById((int)$id, true);

            if (!$user) {
                Response::notFound('Usuario no encontrado');
                return;
            }

            Response::success($user->toArrayWithExtendedData());
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/users
    public function store(): void
    {
        try {
            AuthMiddleware::requireAdmin();

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

            // Check if email exists
            if ($this->userRepo->findByEmail($data['email'])) {
                Response::badRequest('El email ya está registrado');
                return;
            }

            $user = new User($data);
            $user->setPassword($data['password']);

            $id = $this->userRepo->create($user);

            Response::created(['id' => $id, 'user' => $user->toArray()]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // PUT /api/users/:id
    public function update(string $id): void
    {
        try {
            $currentUser = AuthMiddleware::requireAuth();

            // Users can only update their own data unless admin
            if ($currentUser['id'] != $id && $currentUser['rol'] !== 'admin') {
                Response::forbidden('No tienes permiso para actualizar este usuario');
                return;
            }

            $user = $this->userRepo->findById((int)$id);
            if (!$user) {
                Response::notFound('Usuario no encontrado');
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (isset($data['nombre'])) $user->nombre = $data['nombre'];
            if (isset($data['email'])) $user->email = $data['email'];

            // Only admin can change rol and estado
            if ($currentUser['rol'] === 'admin') {
                if (isset($data['rol'])) $user->rol = $data['rol'];
                if (isset($data['estado'])) $user->estado = $data['estado'];
            }

            $this->userRepo->update((int)$id, $user);

            Response::updated($user->toArray());
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // DELETE /api/users/:id
    public function destroy(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $user = $this->userRepo->findById((int)$id);
            if (!$user) {
                Response::notFound('Usuario no encontrado');
                return;
            }

            $this->userRepo->delete((int)$id);

            Response::deleted('Usuario eliminado correctamente');
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }
}
