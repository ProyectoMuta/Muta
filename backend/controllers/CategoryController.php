<?php
namespace Controllers;
use Repositories\CategoryRepository;
use Models\Category;
use Utils\Response;
use Middleware\AuthMiddleware;

class CategoryController
{
    private $repo;
    public function __construct() { $this->repo = new CategoryRepository(); }

    public function index(): void {
        try {
            $onlyEnabled = isset($_GET['enabled']) ? filter_var($_GET['enabled'], FILTER_VALIDATE_BOOLEAN) : false;
            $categories = $this->repo->findAll($onlyEnabled);
            Response::success(array_map(fn($c) => $c->toJson(), $categories));
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function show(string $id): void {
        try {
            $category = $this->repo->findById($id);
            if (!$category) { Response::notFound('Categoría no encontrada'); return; }
            Response::success($category->toJson());
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function store(): void {
        try {
            AuthMiddleware::requireAdmin();
            $data = json_decode(file_get_contents('php://input'), true);
            $category = new Category($data);
            $id = $this->repo->create($category);
            Response::created(['id' => $id]);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function update(string $id): void {
        try {
            AuthMiddleware::requireAdmin();
            $category = $this->repo->findById($id);
            if (!$category) { Response::notFound(); return; }
            $data = json_decode(file_get_contents('php://input'), true);
            foreach ($data as $k => $v) { if (property_exists($category, $k) && $k !== '_id') $category->{$k} = $v; }
            $this->repo->update($id, $category);
            Response::updated($category->toJson());
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
