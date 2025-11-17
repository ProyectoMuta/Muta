<?php

namespace Repositories;

use Config\MongoDB;
use Models\Category;
use MongoDB\BSON\ObjectId;

class CategoryRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->categories_config;
    }

    // CREATE
    public function create(Category $category): ?string
    {
        try {
            $result = $this->collection->insertOne($category->toArray());
            return (string) $result->getInsertedId();
        } catch (\Exception $e) {
            error_log("Error creating category: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Find by ID
    public function findById(string $id): ?Category
    {
        try {
            $document = $this->collection->findOne(['_id' => new ObjectId($id)]);
            return $document ? new Category((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding category: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by slug
    public function findBySlug(string $slug): ?Category
    {
        try {
            $document = $this->collection->findOne(['slug' => $slug]);
            return $document ? new Category((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding category by slug: " . $e->getMessage());
            return null;
        }
    }

    // READ - Get all
    public function findAll(bool $onlyEnabled = false): array
    {
        try {
            $filter = $onlyEnabled ? ['enabled' => true] : [];
            $cursor = $this->collection->find($filter, ['sort' => ['nombre' => 1]]);

            $categories = [];
            foreach ($cursor as $document) {
                $categories[] = new Category((array) $document);
            }
            return $categories;
        } catch (\Exception $e) {
            error_log("Error finding categories: " . $e->getMessage());
            return [];
        }
    }

    // UPDATE
    public function update(string $id, Category $category): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $category->toArray()]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating category: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Partial
    public function updateFields(string $id, array $fields): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $fields]
            );
            return $result->getModifiedCount() > 0 || $result->getMatchedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating category fields: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE
    public function delete(string $id): bool
    {
        try {
            $result = $this->collection->deleteOne(['_id' => new ObjectId($id)]);
            return $result->getDeletedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error deleting category: " . $e->getMessage());
            throw $e;
        }
    }

    // Toggle category/subcategory
    public function toggleEnabled(string $id, bool $enabled): bool
    {
        return $this->updateFields($id, ['enabled' => $enabled]);
    }

    // Save all categories (batch update)
    public function saveAll(array $categories): bool
    {
        try {
            // Delete all and insert new ones
            $this->collection->deleteMany([]);

            foreach ($categories as $categoryData) {
                $category = new Category($categoryData);
                $this->collection->insertOne($category->toArray());
            }

            return true;
        } catch (\Exception $e) {
            error_log("Error saving all categories: " . $e->getMessage());
            throw $e;
        }
    }
}
