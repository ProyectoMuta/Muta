<?php
namespace Controllers;
use Repositories\OrderRepository;
use Utils\Response;
use Middleware\AuthMiddleware;

class AnalyticsController
{
    private $repo;
    public function __construct() { $this->repo = new OrderRepository(); }

    public function statistics(): void {
        try {
            AuthMiddleware::requireAdmin();
            $days = (int)($_GET['days'] ?? 30);
            $stats = $this->repo->getStatistics($days);
            Response::success($stats);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function bestSelling(): void {
        try {
            AuthMiddleware::requireAdmin();
            $limit = (int)($_GET['limit'] ?? 10);
            $products = $this->repo->getBestSellingProducts($limit);
            Response::success($products);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function byPaymentMethod(): void {
        try {
            AuthMiddleware::requireAdmin();
            $sales = $this->repo->getSalesByPaymentMethod();
            Response::success($sales);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }
}
