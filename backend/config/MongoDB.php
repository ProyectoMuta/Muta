<?php

namespace Config;

use MongoDB\Client;
use MongoDB\Database as MongoDatabase;

class MongoDB
{
    private static ?MongoDatabase $instance = null;

    private function __construct() {}

    public static function getInstance(): MongoDatabase
    {
        if (self::$instance === null) {
            try {
                $uri = $_ENV['MONGODB_URI'] ?? 'mongodb://localhost:27017';
                $database = $_ENV['MONGODB_DATABASE'] ?? 'mutaDB';

                $client = new Client($uri);
                self::$instance = $client->selectDatabase($database);

            } catch (\Exception $e) {
                error_log("MongoDB connection error: " . $e->getMessage());
                throw new \Exception("MongoDB connection failed: " . $e->getMessage());
            }
        }

        return self::$instance;
    }

    public static function closeConnection(): void
    {
        self::$instance = null;
    }
}
