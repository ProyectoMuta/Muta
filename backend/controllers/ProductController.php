<?php

namespace Controllers;

use Repositories\ProductRepository;
use Repositories\ImageRepository;
use Models\Product;
use Utils\Response;
use Utils\Validator;
use Middleware\AuthMiddleware;

class ProductController
{
    private ProductRepository $productRepo;
    private ImageRepository $imageRepo;

    public function __construct()
    {
        $this->productRepo = new ProductRepository();
        $this->imageRepo = new ImageRepository();
    }

    // GET /api/products
    public function index(): void
    {
        try {
            $limit = (int)($_GET['limit'] ?? 20);
            $skip = (int)($_GET['skip'] ?? 0);
            $page = (int)($_GET['page'] ?? 1);

            if ($page > 1) {
                $skip = ($page - 1) * $limit;
            }

            $filters = [];
            if (isset($_GET['categoria'])) $filters['categoriaSlug'] = $_GET['categoria'];
            if (isset($_GET['subcategoria'])) $filters['subcategoriaSlug'] = $_GET['subcategoria'];
            if (isset($_GET['estado'])) $filters['estado'] = $_GET['estado'];
            if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
            if (isset($_GET['newArrival'])) $filters['newArrival'] = filter_var($_GET['newArrival'], FILTER_VALIDATE_BOOLEAN);

            // Default: only show publicable products for non-admin
            $user = AuthMiddleware::getOptionalUser();
            if (!$user || $user['rol'] !== 'admin') {
                $filters['publicable'] = true;
            }

            $products = $this->productRepo->findAll($filters, $limit, $skip);
            $total = $this->productRepo->count($filters);

            Response::success([
                'products' => array_map(fn($p) => $p->toJson(), $products),
                'total' => $total,
                'limit' => $limit,
                'skip' => $skip,
                'page' => $page,
                'totalPages' => ceil($total / $limit)
            ]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // GET /api/products/:id
    public function show(string $id): void
    {
        try {
            $product = $this->productRepo->findById($id);

            if (!$product) {
                Response::notFound('Producto no encontrado');
                return;
            }

            Response::success($product->toJson());
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/products
    public function store(): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $data = json_decode(file_get_contents('php://input'), true);

            $validator = new Validator();
            $validator->required($data['nombre'] ?? '', 'nombre')
                      ->required($data['descripcion'] ?? '', 'descripcion')
                      ->required($data['precio'] ?? '', 'precio')
                      ->numeric($data['precio'] ?? '', 'precio')
                      ->required($data['categoria'] ?? '', 'categoria')
                      ->required($data['categoriaSlug'] ?? '', 'categoriaSlug');

            if (!$validator->isValid()) {
                Response::badRequest('Errores de validación', $validator->getErrors());
                return;
            }

            $product = new Product($data);
            $product->stock = $product->calculateTotalStock();
            $product->updateEstado();

            $id = $this->productRepo->create($product);

            Response::created(['id' => $id, 'product' => $product->toJson()]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // PUT /api/products/:id
    public function update(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $existing = $this->productRepo->findById($id);
            if (!$existing) {
                Response::notFound('Producto no encontrado');
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            foreach ($data as $key => $value) {
                if (property_exists($existing, $key) && $key !== '_id') {
                    $existing->{$key} = $value;
                }
            }

            $existing->stock = $existing->calculateTotalStock();
            $existing->updateEstado();

            $this->productRepo->update($id, $existing);

            Response::updated($existing->toJson());
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // DELETE /api/products/:id
    public function destroy(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $product = $this->productRepo->findById($id);
            if (!$product) {
                Response::notFound('Producto no encontrado');
                return;
            }

            // Soft delete
            $this->productRepo->softDelete($id);

            Response::deleted('Producto eliminado correctamente');
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // GET /api/products/new-arrivals
    public function newArrivals(): void
    {
        try {
            $limit = (int)($_GET['limit'] ?? 10);
            $products = $this->productRepo->getNewArrivals($limit);

            Response::success(array_map(fn($p) => $p->toJson(), $products));
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // GET /api/products/search
    public function search(): void
    {
        try {
            $query = $_GET['q'] ?? '';
            $limit = (int)($_GET['limit'] ?? 20);

            if (empty($query)) {
                Response::badRequest('El parámetro "q" es requerido');
                return;
            }

            $products = $this->productRepo->search($query, $limit);

            Response::success(array_map(fn($p) => $p->toJson(), $products));
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/products/:id/stock
    public function updateStock(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $data = json_decode(file_get_contents('php://input'), true);
            $stock = (int)($data['stock'] ?? 0);

            $this->productRepo->updateStock($id, $stock);

            Response::success(['message' => 'Stock actualizado correctamente']);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/products/:id/variants/:variantId/stock
    public function updateVariantStock(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $data = json_decode(file_get_contents('php://input'), true);

            $color = $data['color'] ?? '';
            $talle = $data['talle'] ?? '';
            $stock = (int)($data['stock'] ?? 0);

            $this->productRepo->updateVariantStock($id, $color, $talle, $stock);

            Response::success(['message' => 'Stock de variante actualizado correctamente']);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // POST /api/products/:id/images
    public function uploadImage(string $id): void
    {
        try {
            AuthMiddleware::requireAdmin();

            $product = $this->productRepo->findById($id);
            if (!$product) {
                Response::notFound('Producto no encontrado');
                return;
            }

            if (empty($_FILES['image'])) {
                Response::badRequest('No se proporcionó ninguna imagen');
                return;
            }

            $image = $this->imageRepo->upload($_FILES['image'], 'product', $id);

            if (!$image) {
                Response::badRequest('Error al subir la imagen');
                return;
            }

            // Add image URL to product
            $product->imagenes[] = $image->url;
            $this->productRepo->update($id, $product);

            Response::created(['image' => $image->toArray()]);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }

    // GET /api/products/check-stock
    public function checkStock(): void
    {
        try {
            $ids = $_GET['ids'] ?? '';

            if (empty($ids)) {
                Response::badRequest('El parámetro "ids" es requerido');
                return;
            }

            $productIds = explode(',', $ids);
            $stockInfo = $this->productRepo->checkStock($productIds);

            Response::success($stockInfo);
        } catch (\Exception $e) {
            Response::serverError($e->getMessage());
        }
    }
}
