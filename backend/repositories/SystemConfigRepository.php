<?php

namespace Repositories;

use Config\MongoDB;
use Models\SystemConfig;
use MongoDB\BSON\ObjectId;

class SystemConfigRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->system_config;
    }

    // CREATE
    public function create(SystemConfig $config): ?string
    {
        try {
            $result = $this->collection->insertOne($config->toArray());
            return (string) $result->getInsertedId();
        } catch (\Exception $e) {
            error_log("Error creating config: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Find by ID
    public function findById(string $id): ?SystemConfig
    {
        try {
            $document = $this->collection->findOne(['_id' => new ObjectId($id)]);
            return $document ? new SystemConfig((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding config: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by key
    public function findByKey(string $key): ?SystemConfig
    {
        try {
            $document = $this->collection->findOne(['key' => $key]);
            return $document ? new SystemConfig((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding config by key: " . $e->getMessage());
            return null;
        }
    }

    // READ - Get value by key
    public function getValue(string $key, $default = null)
    {
        $config = $this->findByKey($key);
        return $config ? $config->getValue() : $default;
    }

    // READ - Get all
    public function findAll(): array
    {
        try {
            $cursor = $this->collection->find([], ['sort' => ['key' => 1]]);
            $configs = [];
            foreach ($cursor as $document) {
                $configs[] = new SystemConfig((array) $document);
            }
            return $configs;
        } catch (\Exception $e) {
            error_log("Error finding configs: " . $e->getMessage());
            return [];
        }
    }

    // UPDATE
    public function update(string $id, SystemConfig $config): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $config->toArray()]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating config: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE or CREATE by key
    public function set(string $key, $value, string $tipo = 'string', ?string $descripcion = null): bool
    {
        try {
            $existing = $this->findByKey($key);

            if ($existing) {
                $existing->setValue($value);
                if ($descripcion) {
                    $existing->descripcion = $descripcion;
                }
                return $this->update((string) $existing->_id, $existing);
            } else {
                $config = new SystemConfig([
                    'key' => $key,
                    'value' => $value,
                    'tipo' => $tipo,
                    'descripcion' => $descripcion
                ]);
                $this->create($config);
                return true;
            }
        } catch (\Exception $e) {
            error_log("Error setting config: " . $e->getMessage());
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
            error_log("Error deleting config: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE by key
    public function deleteByKey(string $key): bool
    {
        try {
            $result = $this->collection->deleteOne(['key' => $key]);
            return $result->getDeletedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error deleting config by key: " . $e->getMessage());
            throw $e;
        }
    }

    // Get multiple values by keys
    public function getMultiple(array $keys): array
    {
        try {
            $cursor = $this->collection->find(['key' => ['$in' => $keys]]);
            $values = [];
            foreach ($cursor as $document) {
                $config = new SystemConfig((array) $document);
                $values[$config->key] = $config->getValue();
            }
            return $values;
        } catch (\Exception $e) {
            error_log("Error getting multiple configs: " . $e->getMessage());
            return [];
        }
    }
}
