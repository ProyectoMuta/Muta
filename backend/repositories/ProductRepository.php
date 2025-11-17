<?php

namespace Repositories;

use Config\MongoDB;
use Models\Product;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\Regex;

class ProductRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->products;
    }

    // CREATE
    public function create(Product $product): ?string
    {
        try {
            $result = $this->collection->insertOne($product->toArray());
            return (string) $result->getInsertedId();
        } catch (\Exception $e) {
            error_log("Error creating product: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Get by ID
    public function findById(string $id): ?Product
    {
        try {
            $document = $this->collection->findOne(['_id' => new ObjectId($id)]);
            return $document ? new Product((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding product: " . $e->getMessage());
            return null;
        }
    }

    // READ - Get all with filters and pagination
    public function findAll(array $filters = [], int $limit = 20, int $skip = 0, array $sort = []): array
    {
        try {
            $query = $this->buildQuery($filters);
            $options = [
                'limit' => $limit,
                'skip' => $skip,
            ];

            if (!empty($sort)) {
                $options['sort'] = $sort;
            } else {
                $options['sort'] = ['fechaAlta' => -1];
            }

            $cursor = $this->collection->find($query, $options);
            $products = [];
            foreach ($cursor as $document) {
                $products[] = new Product((array) $document);
            }
            return $products;
        } catch (\Exception $e) {
            error_log("Error finding products: " . $e->getMessage());
            return [];
        }
    }

    // READ - Count with filters
    public function count(array $filters = []): int
    {
        try {
            $query = $this->buildQuery($filters);
            return $this->collection->countDocuments($query);
        } catch (\Exception $e) {
            error_log("Error counting products: " . $e->getMessage());
            return 0;
        }
    }

    // UPDATE
    public function update(string $id, Product $product): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $product->toArray()]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating product: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Partial update
    public function updateFields(string $id, array $fields): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $fields]
            );
            return $result->getModifiedCount() > 0 || $result->getMatchedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating product fields: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE - Soft delete
    public function softDelete(string $id): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => ['eliminado' => true, 'estado' => 'Eliminado', 'publicable' => false]]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error soft deleting product: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE - Hard delete
    public function delete(string $id): bool
    {
        try {
            $result = $this->collection->deleteOne(['_id' => new ObjectId($id)]);
            return $result->getDeletedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error deleting product: " . $e->getMessage());
            throw $e;
        }
    }

    // SEARCH
    public function search(string $query, int $limit = 20): array
    {
        try {
            $regex = new Regex($query, 'i');
            $filter = [
                '$or' => [
                    ['nombre' => $regex],
                    ['descripcion' => $regex],
                    ['categoria' => $regex],
                    ['subcategoria' => $regex],
                ],
                'eliminado' => false
            ];

            $cursor = $this->collection->find($filter, ['limit' => $limit]);
            $products = [];
            foreach ($cursor as $document) {
                $products[] = new Product((array) $document);
            }
            return $products;
        } catch (\Exception $e) {
            error_log("Error searching products: " . $e->getMessage());
            return [];
        }
    }

    // Get new arrivals
    public function getNewArrivals(int $limit = 10): array
    {
        try {
            $cursor = $this->collection->find(
                ['newArrival' => true, 'eliminado' => false, 'publicable' => true],
                ['limit' => $limit, 'sort' => ['fechaAlta' => -1]]
            );
            $products = [];
            foreach ($cursor as $document) {
                $products[] = new Product((array) $document);
            }
            return $products;
        } catch (\Exception $e) {
            error_log("Error getting new arrivals: " . $e->getMessage());
            return [];
        }
    }

    // Get by category
    public function findByCategory(string $categorySlug, ?string $subcategorySlug = null, int $limit = 20, int $skip = 0): array
    {
        try {
            $filter = [
                'categoriaSlug' => $categorySlug,
                'eliminado' => false,
                'publicable' => true
            ];

            if ($subcategorySlug) {
                $filter['subcategoriaSlug'] = $subcategorySlug;
            }

            $cursor = $this->collection->find($filter, [
                'limit' => $limit,
                'skip' => $skip,
                'sort' => ['fechaAlta' => -1]
            ]);

            $products = [];
            foreach ($cursor as $document) {
                $products[] = new Product((array) $document);
            }
            return $products;
        } catch (\Exception $e) {
            error_log("Error finding products by category: " . $e->getMessage());
            return [];
        }
    }

    // Check stock for multiple products
    public function checkStock(array $productIds): array
    {
        try {
            $objectIds = array_map(function($id) {
                return new ObjectId($id);
            }, $productIds);

            $cursor = $this->collection->find([
                '_id' => ['$in' => $objectIds]
            ], [
                'projection' => ['_id' => 1, 'nombre' => 1, 'stock' => 1, 'variantes' => 1, 'estado' => 1]
            ]);

            $stockInfo = [];
            foreach ($cursor as $document) {
                $stockInfo[(string) $document['_id']] = [
                    'id' => (string) $document['_id'],
                    'nombre' => $document['nombre'],
                    'stock' => $document['stock'],
                    'variantes' => $document['variantes'] ?? [],
                    'estado' => $document['estado']
                ];
            }
            return $stockInfo;
        } catch (\Exception $e) {
            error_log("Error checking stock: " . $e->getMessage());
            return [];
        }
    }

    // Update stock
    public function updateStock(string $id, int $newStock): bool
    {
        try {
            $product = $this->findById($id);
            if (!$product) {
                return false;
            }

            $product->stock = $newStock;
            $product->updateEstado();

            return $this->updateFields($id, [
                'stock' => $product->stock,
                'estado' => $product->estado
            ]);
        } catch (\Exception $e) {
            error_log("Error updating stock: " . $e->getMessage());
            throw $e;
        }
    }

    // Update variant stock
    public function updateVariantStock(string $id, string $color, string $talle, int $newStock): bool
    {
        try {
            $product = $this->findById($id);
            if (!$product) {
                return false;
            }

            foreach ($product->variantes as &$variante) {
                if ($variante['color'] === $color && $variante['talle'] === $talle) {
                    $variante['stock'] = $newStock;
                    break;
                }
            }

            $product->stock = $product->calculateTotalStock();
            $product->updateEstado();

            return $this->updateFields($id, [
                'variantes' => $product->variantes,
                'stock' => $product->stock,
                'estado' => $product->estado
            ]);
        } catch (\Exception $e) {
            error_log("Error updating variant stock: " . $e->getMessage());
            throw $e;
        }
    }

    // Build query from filters
    private function buildQuery(array $filters): array
    {
        $query = [];

        if (isset($filters['eliminado'])) {
            $query['eliminado'] = $filters['eliminado'];
        } else {
            $query['eliminado'] = false;
        }

        if (isset($filters['publicable'])) {
            $query['publicable'] = $filters['publicable'];
        }

        if (isset($filters['categoriaSlug'])) {
            $query['categoriaSlug'] = $filters['categoriaSlug'];
        }

        if (isset($filters['subcategoriaSlug'])) {
            $query['subcategoriaSlug'] = $filters['subcategoriaSlug'];
        }

        if (isset($filters['estado'])) {
            $query['estado'] = $filters['estado'];
        }

        if (isset($filters['newArrival'])) {
            $query['newArrival'] = $filters['newArrival'];
        }

        if (isset($filters['search'])) {
            $regex = new Regex($filters['search'], 'i');
            $query['$or'] = [
                ['nombre' => $regex],
                ['descripcion' => $regex],
            ];
        }

        return $query;
    }
}
