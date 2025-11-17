<?php

namespace Repositories;

use Config\MongoDB;

class FavoriteRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->usuarios_datos;
    }

    // GET favorites for user
    public function get(int $userId): array
    {
        try {
            $document = $this->collection->findOne(
                ['id_usuario' => $userId],
                ['projection' => ['favoritos' => 1]]
            );

            return $document['favoritos'] ?? [];
        } catch (\Exception $e) {
            error_log("Error getting favorites: " . $e->getMessage());
            return [];
        }
    }

    // UPDATE favorites
    public function update(int $userId, array $favorites): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['id_usuario' => $userId],
                ['$set' => ['favoritos' => $favorites]],
                ['upsert' => true]
            );

            return $result->getModifiedCount() > 0 ||
                   $result->getUpsertedCount() > 0 ||
                   $result->getMatchedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating favorites: " . $e->getMessage());
            throw $e;
        }
    }

    // ADD favorite
    public function add(int $userId, string $productId): bool
    {
        try {
            $favorites = $this->get($userId);

            // Check if already in favorites
            if (!in_array($productId, $favorites)) {
                $favorites[] = $productId;
                return $this->update($userId, $favorites);
            }

            return true; // Already in favorites
        } catch (\Exception $e) {
            error_log("Error adding favorite: " . $e->getMessage());
            throw $e;
        }
    }

    // REMOVE favorite
    public function remove(int $userId, string $productId): bool
    {
        try {
            $favorites = $this->get($userId);

            $favorites = array_filter($favorites, function($id) use ($productId) {
                return $id !== $productId;
            });

            $favorites = array_values($favorites); // Re-index array

            return $this->update($userId, $favorites);
        } catch (\Exception $e) {
            error_log("Error removing favorite: " . $e->getMessage());
            throw $e;
        }
    }

    // TOGGLE favorite
    public function toggle(int $userId, string $productId): bool
    {
        try {
            $favorites = $this->get($userId);

            if (in_array($productId, $favorites)) {
                return $this->remove($userId, $productId);
            } else {
                return $this->add($userId, $productId);
            }
        } catch (\Exception $e) {
            error_log("Error toggling favorite: " . $e->getMessage());
            throw $e;
        }
    }

    // CLEAR all favorites
    public function clear(int $userId): bool
    {
        return $this->update($userId, []);
    }

    // COUNT favorites
    public function count(int $userId): int
    {
        $favorites = $this->get($userId);
        return count($favorites);
    }

    // CHECK if product is favorite
    public function isFavorite(int $userId, string $productId): bool
    {
        $favorites = $this->get($userId);
        return in_array($productId, $favorites);
    }
}
