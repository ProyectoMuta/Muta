<?php
namespace Controllers;
use Repositories\OrderRepository;
use Models\Order;
use Utils\Response;
use Middleware\AuthMiddleware;

class OrderController
{
    private $repo;
    public function __construct() { $this->repo = new OrderRepository(); }

    public function index(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $filters = $user['rol'] === 'admin' ? [] : ['usuario_id' => (string)$user['id']];
            if (isset($_GET['estado'])) $filters['estado'] = $_GET['estado'];
            $orders = $this->repo->findAll($filters, (int)($_GET['limit'] ?? 20), (int)($_GET['skip'] ?? 0));
            Response::success(array_map(fn($o) => $o->toJson(), $orders));
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function show(string $id): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $order = $this->repo->findById($id);
            if (!$order) { Response::notFound('Pedido no encontrado'); return; }
            if ($user['rol'] !== 'admin' && $order->usuario_id != $user['id']) {
                Response::forbidden(); return;
            }
            Response::success($order->toJson());
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function store(): void {
        try {
            $user = AuthMiddleware::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);
            $data['usuario_id'] = (string)$user['id'];
            $order = new Order($data);
            $order->calculateTotal();
            $id = $this->repo->create($order);
            Response::created(['id' => $id]);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function update(string $id): void {
        try {
            AuthMiddleware::requireAdmin();
            $order = $this->repo->findById($id);
            if (!$order) { Response::notFound(); return; }
            $data = json_decode(file_get_contents('php://input'), true);
            foreach ($data as $k => $v) { if (property_exists($order, $k) && $k !== '_id') $order->{$k} = $v; }
            $this->repo->update($id, $order);
            Response::updated($order->toJson());
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function updateStatus(string $id): void {
        try {
            AuthMiddleware::requireAdmin();
            $data = json_decode(file_get_contents('php://input'), true);
            $this->repo->updateStatus($id, $data['estado'], $data['nota'] ?? null);
            Response::success(['message' => 'Estado actualizado']);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function destroy(string $id): void {
        try {
            AuthMiddleware::requireAdmin();
            $this->repo->delete($id);
            Response::deleted();
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }
}
