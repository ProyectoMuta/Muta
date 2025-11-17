<?php
namespace Controllers;
use Repositories\BrandRepository;
use Models\Brand;
use Utils\Response;
use Middleware\AuthMiddleware;

class BrandController
{
    private $repo;
    public function __construct() { $this->repo = new BrandRepository(); }

    public function index(): void {
        try {
            $brand = $this->repo->get();
            Response::success($brand ? $brand->toJson() : null);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function show(string $id): void {
        try {
            $brand = $this->repo->findById($id);
            if (!$brand) { Response::notFound(); return; }
            Response::success($brand->toJson());
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function store(): void {
        try {
            AuthMiddleware::requireAdmin();
            $data = json_decode(file_get_contents('php://input'), true);
            $brand = new Brand($data);
            $id = $this->repo->create($brand);
            Response::created(['id' => $id]);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function update(string $id): void {
        try {
            AuthMiddleware::requireAdmin();
            $data = json_decode(file_get_contents('php://input'), true);
            $brand = new Brand($data);
            $brand->_id = new \MongoDB\BSON\ObjectId($id);
            $this->repo->save($brand);
            Response::updated($brand->toJson());
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
