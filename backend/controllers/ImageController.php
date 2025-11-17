<?php
namespace Controllers;
use Repositories\ImageRepository;
use Utils\Response;
use Middleware\AuthMiddleware;

class ImageController
{
    private $repo;
    public function __construct() { $this->repo = new ImageRepository(); }

    public function index(): void {
        try {
            AuthMiddleware::requireAdmin();
            $images = $this->repo->listAll();
            Response::success(array_map(fn($i) => $i->toArray(), $images));
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function upload(): void {
        try {
            AuthMiddleware::requireAdmin();
            if (empty($_FILES['image'])) {
                Response::badRequest('No se proporcionó ninguna imagen');
                return;
            }
            $image = $this->repo->upload($_FILES['image']);
            Response::created(['image' => $image->toArray()]);
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }

    public function destroy(string $filename): void {
        try {
            AuthMiddleware::requireAdmin();
            $this->repo->delete($filename);
            Response::deleted();
        } catch (\Exception $e) { Response::serverError($e->getMessage()); }
    }
}
