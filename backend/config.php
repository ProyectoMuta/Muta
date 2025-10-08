<?php
require __DIR__ . '/vendor/autoload.php'; // carga automática de Composer

try {
    // Conexión a MongoDB en localhost
    $client = new MongoDB\Client("mongodb://localhost:27017");

    // Seleccionar base de datos
    $db = $client->mutaDB;

} catch (Exception $e) {
    die("Error al conectar con MongoDB: " . $e->getMessage());
}
?>
