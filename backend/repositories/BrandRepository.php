<?php

namespace Repositories;

use Config\MongoDB;
use Models\Brand;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class BrandRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->marca;
    }

    // CREATE
    public function create(Brand $brand): ?string
    {
        try {
            $result = $this->collection->insertOne($brand->toArray());
            return (string) $result->getInsertedId();
        } catch (\Exception $e) {
            error_log("Error creating brand: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Get (usually there's only one)
    public function get(): ?Brand
    {
        try {
            $document = $this->collection->findOne([]);
            return $document ? new Brand((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error getting brand: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by ID
    public function findById(string $id): ?Brand
    {
        try {
            $document = $this->collection->findOne(['_id' => new ObjectId($id)]);
            return $document ? new Brand((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding brand: " . $e->getMessage());
            return null;
        }
    }

    // UPDATE or CREATE (upsert)
    public function save(Brand $brand): bool
    {
        try {
            if ($brand->_id) {
                // Update existing
                $brand->actualizado_en = new UTCDateTime();
                $result = $this->collection->updateOne(
                    ['_id' => $brand->_id],
                    ['$set' => $brand->toArray()]
                );
                return $result->getModifiedCount() > 0 || $result->getMatchedCount() > 0;
            } else {
                // Check if brand already exists
                $existing = $this->get();
                if ($existing) {
                    // Update existing
                    $brand->_id = $existing->_id;
                    $brand->actualizado_en = new UTCDateTime();
                    $result = $this->collection->updateOne(
                        ['_id' => $existing->_id],
                        ['$set' => $brand->toArray()]
                    );
                    return $result->getModifiedCount() > 0 || $result->getMatchedCount() > 0;
                } else {
                    // Create new
                    $this->create($brand);
                    return true;
                }
            }
        } catch (\Exception $e) {
            error_log("Error saving brand: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE
    public function update(string $id, Brand $brand): bool
    {
        try {
            $brand->actualizado_en = new UTCDateTime();
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $brand->toArray()]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating brand: " . $e->getMessage());
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
            error_log("Error deleting brand: " . $e->getMessage());
            throw $e;
        }
    }
}
