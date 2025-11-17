<?php

namespace Repositories;

use Config\MongoDB;

class CartRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->usuarios_datos;
    }

    // GET cart for user
    public function get(int $userId): array
    {
        try {
            $document = $this->collection->findOne(
                ['id_usuario' => $userId],
                ['projection' => ['carrito' => 1]]
            );

            return $document['carrito'] ?? [];
        } catch (\Exception $e) {
            error_log("Error getting cart: " . $e->getMessage());
            return [];
        }
    }

    // UPDATE cart
    public function update(int $userId, array $cart): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['id_usuario' => $userId],
                ['$set' => ['carrito' => $cart]],
                ['upsert' => true]
            );

            return $result->getModifiedCount() > 0 ||
                   $result->getUpsertedCount() > 0 ||
                   $result->getMatchedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating cart: " . $e->getMessage());
            throw $e;
        }
    }

    // ADD item to cart
    public function addItem(int $userId, array $item): bool
    {
        try {
            $cart = $this->get($userId);

            // Check if item already exists (same product, color, talle)
            $found = false;
            foreach ($cart as &$cartItem) {
                if (
                    $cartItem['producto_id'] === $item['producto_id'] &&
                    $cartItem['color'] === $item['color'] &&
                    $cartItem['talle'] === $item['talle']
                ) {
                    // Update quantity
                    $cartItem['cantidad'] = ($cartItem['cantidad'] ?? 1) + ($item['cantidad'] ?? 1);
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $cart[] = $item;
            }

            return $this->update($userId, $cart);
        } catch (\Exception $e) {
            error_log("Error adding item to cart: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE item quantity
    public function updateItemQuantity(int $userId, string $productId, string $color, string $talle, int $quantity): bool
    {
        try {
            $cart = $this->get($userId);

            foreach ($cart as &$item) {
                if (
                    $item['producto_id'] === $productId &&
                    $item['color'] === $color &&
                    $item['talle'] === $talle
                ) {
                    $item['cantidad'] = $quantity;
                    break;
                }
            }

            return $this->update($userId, $cart);
        } catch (\Exception $e) {
            error_log("Error updating item quantity: " . $e->getMessage());
            throw $e;
        }
    }

    // REMOVE item from cart
    public function removeItem(int $userId, string $productId, string $color, string $talle): bool
    {
        try {
            $cart = $this->get($userId);

            $cart = array_filter($cart, function($item) use ($productId, $color, $talle) {
                return !(
                    $item['producto_id'] === $productId &&
                    $item['color'] === $color &&
                    $item['talle'] === $talle
                );
            });

            $cart = array_values($cart); // Re-index array

            return $this->update($userId, $cart);
        } catch (\Exception $e) {
            error_log("Error removing item from cart: " . $e->getMessage());
            throw $e;
        }
    }

    // CLEAR cart
    public function clear(int $userId): bool
    {
        return $this->update($userId, []);
    }

    // COUNT items in cart
    public function count(int $userId): int
    {
        $cart = $this->get($userId);
        return count($cart);
    }
}
