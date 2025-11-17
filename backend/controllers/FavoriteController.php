<?php
namespace Controllers;
use Repositories\FavoriteRepository;
use Utils\Response;
use Middleware\AuthMiddleware;

class FavoriteController
{
    private $repo;
    public function __construct() { $this->repo = new FavoriteRepository(); }

    public function index(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $favorites = $this->repo->get($user['id']);
            Response::success($favorites);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function add(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->add($user['id'], $data['producto_id']);
            Response::created(['message' => 'Producto agregado a favoritos']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function remove(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->remove($user['id'], $data['producto_id']);
            Response::deleted('Producto eliminado de favoritos');
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function toggle(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->toggle($user['id'], $data['producto_id']);
            Response::success(['message' => 'Favorito actualizado']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }
}
