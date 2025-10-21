<?php
// /backend/configUsuarios/dbUsMySQL.php

try {
    $pdo = new PDO("mysql:host=localhost;dbname=mutaDB;charset=utf8mb4", "muta_dev", "muta123");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Error de conexión a MySQL: " . $e->getMessage());
}
