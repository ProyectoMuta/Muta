
<?php
require __DIR__ . '/vendor/autoload.php';
// --------------------
// Conexión a MongoDB
// --------------------
try {
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $mongoDB = $client->mutaDB; // base de datos en Mongo
    $db = $mongoDB;
} catch (Exception $e) {
    die("Error al conectar con MongoDB: " . $e->getMessage());
}
// --------------------
// Conexión a MySQL (XAMPP)
// --------------------
$servername = "localhost";
$username   = "root";   // el usuario que creaste
$password   = "";    // la contraseña que definiste
$dbname     = "mutaDB";     // la base de datos
$conn = new mysqli($servername, $username, $password, $dbname);
// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar con MariaDB: " . $conn->connect_error);
}
?>