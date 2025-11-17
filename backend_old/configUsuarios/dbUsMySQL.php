<?php
// /backend/configUsuarios/dbUsMySQL.php

try {
    $pdo = new PDO("mysql:host=localhost;dbname=mutaDB;charset=utf8mb4", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Error de conexión a MySQL: " . $e->getMessage());
}
