<?php
require __DIR__ . "/../vendor/autoload.php"; // carga Composer y la librería mongodb/mongodb

try {
    // Crear cliente de MongoDB
    $mongoClient = new MongoDB\Client("mongodb://localhost:27017");

    // Seleccionar la base de datos (se crea sola si no existe)
    $mongoDB = $mongoClient->mutaDB;

} catch (Exception $e) {
    die(json_encode(["error" => "Error de conexión a MongoDB: " . $e->getMessage()]));
}

