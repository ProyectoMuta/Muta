<?php
namespace Controllers;
use Repositories\CartRepository;
use Utils\Response;
use Middleware\AuthMiddleware;

class CartController
{
    private $repo;
    public function __construct() { $this->repo = new CartRepository(); }

    public function index(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $cart = $this->repo->get($user['id']);
            Response::success($cart);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function update(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->update($user['id'], $data['cart'] ?? []);
            Response::success(['message' => 'Carrito actualizado']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function add(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->addItem($user['id'], $data);
            Response::created(['message' => 'Producto agregado']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function remove(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->removeItem($user['id'], $data['producto_id'], $data['color'], $data['talle']);
            Response::deleted('Producto eliminado');
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function clear(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $this->repo->clear($user['id']);
            Response::success(['message' => 'Carrito vaciado']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }
}
