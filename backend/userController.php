<?php
header("Content-Type: application/json; charset=UTF-8");

require __DIR__ . "/configUsuarios/dbUsMySQL.php";
require __DIR__ . "/configUsuarios/mongoUS.php";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'register') {
    $data = json_decode(file_get_contents("php://input"), true);

    $nombre = $data['nombre'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (!$nombre || !$email || !$password) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    // Verificar si ya existe en MySQL
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(["error" => "Email ya registrado"]);
        exit;
    }

    // Guardar en MySQL
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$nombre, $email, $hash]);
    $idUsuario = $pdo->lastInsertId();

    // Crear documento en MongoDB
    $mongoDB->usuarios_datos->insertOne([
        "id_usuario" => intval($idUsuario),
        "favoritos" => [],
        "carrito" => [],
        "direcciones" => [],
        "envioSeleccionado" => null,
        "pago" => null
    ]);

    echo json_encode(["ok" => true, "id" => $idUsuario]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $stmt = $pdo->prepare("SELECT id, nombre, password_hash FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["error" => "Credenciales inválidas"]);
        exit;
    }

    // Traer datos dinámicos desde MongoDB
    $mongoUser = $mongoDB->usuarios_datos->findOne(["id_usuario" => intval($user['id'])]);

    echo json_encode([
        "ok" => true,
        "id" => $user['id'],
        "nombre" => $user['nombre'],
        "email" => $email,
        "mongo" => $mongoUser
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'getUser') {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Falta id"]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, nombre, email FROM usuarios WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "Usuario no encontrado"]);
        exit;
    }

    $mongoUser = $mongoDB->usuarios_datos->findOne(["id_usuario" => $id]);

    echo json_encode([
        "ok" => true,
        "user" => $user,
        "mongo" => $mongoUser
    ]);
    exit;
}

// === Actualizar carrito ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'updateCart') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $carrito = $data['carrito'] ?? [];

    if (!$idUsuario) {
        http_response_code(400);
        echo json_encode(["error" => "Falta id_usuario"]);
        exit;
    }

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => ["carrito" => $carrito]]
    );

    echo json_encode(["ok" => true]);
    exit;
}

// === Actualizar favoritos ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'updateFavoritos') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $favoritos = $data['favoritos'] ?? [];

    if (!$idUsuario) {
        http_response_code(400);
        echo json_encode(["error" => "Falta id_usuario"]);
        exit;
    }

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => ["favoritos" => $favoritos]]
    );

    echo json_encode(["ok" => true]);
    exit;
}

// === Obtener favoritos ===
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'getFavoritos') {
    $idUsuario = intval($_GET['id'] ?? 0);

    if (!$idUsuario) {
        http_response_code(400);
        echo json_encode(["error" => "Falta id_usuario"]);
        exit;
    }

    $mongoUser = $mongoDB->usuarios_datos->findOne(["id_usuario" => $idUsuario]);

    if (!$mongoUser) {
        http_response_code(404);
        echo json_encode(["error" => "Usuario no encontrado en Mongo"]);
        exit;
    }

    // Devolver solo el array de favoritos
    echo json_encode($mongoUser["favoritos"] ?? []);
    exit;
}

// === Actualizar direcciones falta===
