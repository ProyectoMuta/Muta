<?php

use Controllers\ProductController;
use Controllers\UserController;
use Controllers\AuthController;
use Controllers\OrderController;
use Controllers\CategoryController;
use Controllers\BrandController;
use Controllers\CartController;
use Controllers\FavoriteController;
use Controllers\ImageController;
use Controllers\AnalyticsController;

class Router
{
    private string $method;
    private string $path;
    private array $routes = [];

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $requestUri = $_SERVER['REQUEST_URI'];
        $this->path = parse_url($requestUri, PHP_URL_PATH);
        $this->path = str_replace('/backend', '', $this->path);
    }

    public function get(string $path, callable $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }

    private function addRoute(string $method, string $path, callable $handler): void
    {
        $this->routes[] = compact('method', 'path', 'handler');
    }

    public function resolve(): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $this->method) {
                continue;
            }

            $pattern = $this->convertToRegex($route['path']);

            if (preg_match($pattern, $this->path, $matches)) {
                array_shift($matches); // Remove full match
                call_user_func_array($route['handler'], $matches);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Endpoint no encontrado']);
    }

    private function convertToRegex(string $path): string
    {
        $path = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([a-zA-Z0-9_-]+)', $path);
        return '#^' . $path . '$#';
    }
}

$router = new Router();

// ==================== PRODUCTS ====================
$router->get('/api/products', [new ProductController(), 'index']);
$router->get('/api/products/new-arrivals', [new ProductController(), 'newArrivals']);
$router->get('/api/products/search', [new ProductController(), 'search']);
$router->get('/api/products/check-stock', [new ProductController(), 'checkStock']);
$router->get('/api/products/{id}', [new ProductController(), 'show']);
$router->post('/api/products', [new ProductController(), 'store']);
$router->put('/api/products/{id}', [new ProductController(), 'update']);
$router->delete('/api/products/{id}', [new ProductController(), 'destroy']);
$router->post('/api/products/{id}/stock', [new ProductController(), 'updateStock']);
$router->post('/api/products/{id}/variants/stock', [new ProductController(), 'updateVariantStock']);
$router->post('/api/products/{id}/images', [new ProductController(), 'uploadImage']);

// ==================== USERS ====================
$router->get('/api/users', [new UserController(), 'index']);
$router->get('/api/users/{id}', [new UserController(), 'show']);
$router->post('/api/users', [new UserController(), 'store']);
$router->put('/api/users/{id}', [new UserController(), 'update']);
$router->delete('/api/users/{id}', [new UserController(), 'destroy']);

// ==================== AUTH ====================
$router->post('/api/auth/register', [new AuthController(), 'register']);
$router->post('/api/auth/login', [new AuthController(), 'login']);
$router->post('/api/auth/logout', [new AuthController(), 'logout']);
$router->post('/api/auth/forgot-password', [new AuthController(), 'forgotPassword']);
$router->post('/api/auth/reset-password', [new AuthController(), 'resetPassword']);

// ==================== ORDERS ====================
$router->get('/api/orders', [new OrderController(), 'index']);
$router->get('/api/orders/{id}', [new OrderController(), 'show']);
$router->post('/api/orders', [new OrderController(), 'store']);
$router->put('/api/orders/{id}', [new OrderController(), 'update']);
$router->put('/api/orders/{id}/status', [new OrderController(), 'updateStatus']);
$router->delete('/api/orders/{id}', [new OrderController(), 'destroy']);

// ==================== CATEGORIES ====================
$router->get('/api/categories', [new CategoryController(), 'index']);
$router->get('/api/categories/{id}', [new CategoryController(), 'show']);
$router->post('/api/categories', [new CategoryController(), 'store']);
$router->put('/api/categories/{id}', [new CategoryController(), 'update']);
$router->delete('/api/categories/{id}', [new CategoryController(), 'destroy']);

// ==================== BRAND ====================
$router->get('/api/brand', [new BrandController(), 'index']);
$router->get('/api/brand/{id}', [new BrandController(), 'show']);
$router->post('/api/brand', [new BrandController(), 'store']);
$router->put('/api/brand/{id}', [new BrandController(), 'update']);
$router->delete('/api/brand/{id}', [new BrandController(), 'destroy']);

// ==================== CART ====================
$router->get('/api/cart', [new CartController(), 'index']);
$router->post('/api/cart', [new CartController(), 'update']);
$router->post('/api/cart/add', [new CartController(), 'add']);
$router->post('/api/cart/remove', [new CartController(), 'remove']);
$router->delete('/api/cart', [new CartController(), 'clear']);

// ==================== FAVORITES ====================
$router->get('/api/favorites', [new FavoriteController(), 'index']);
$router->post('/api/favorites/add', [new FavoriteController(), 'add']);
$router->post('/api/favorites/remove', [new FavoriteController(), 'remove']);
$router->post('/api/favorites/toggle', [new FavoriteController(), 'toggle']);

// ==================== IMAGES ====================
$router->get('/api/images', [new ImageController(), 'index']);
$router->post('/api/images', [new ImageController(), 'upload']);
$router->delete('/api/images/{filename}', [new ImageController(), 'destroy']);

// ==================== ANALYTICS ====================
$router->get('/api/analytics/statistics', [new AnalyticsController(), 'statistics']);
$router->get('/api/analytics/best-selling', [new AnalyticsController(), 'bestSelling']);
$router->get('/api/analytics/by-payment-method', [new AnalyticsController(), 'byPaymentMethod']);

$router->resolve();
