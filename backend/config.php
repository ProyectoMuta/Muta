
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
    die(json_encode(["ok" => false, "error" => "MongoDB error: " . $e->getMessage()]));
}
// --------------------
// Conexión a MySQL (XAMPP)
// --------------------

$servername = "localhost";
$username   = "root";   // el usuario que creaste
$password   = "";    // la contraseña que definiste
$dbname     = "mutaDB";     // la base de datos
$charset    = "utf8mb4";

// Data Source Name (DSN)
$dsn = "mysql:host=$servername;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     // Esta línea crea la variable $pdo que userController.php necesita
     $pdo = new PDO($dsn, $username, $password, $options); 
} catch (\PDOException $e) {
     // Si esto falla, también devolverá un JSON, no HTML
     die(json_encode(["ok" => false, "error" => "MySQL/PDO error: " . $e->getMessage()]));
}
?>