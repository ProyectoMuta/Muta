<?php

require_once __DIR__ . '/config.php';

header("Content-Type: application/json; charset=UTF-8");
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/enviar_email.php';

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
        "direcciones" => [
            "domicilios" => [],
            "punto" => null
        ],
        "envioSeleccionado" => null,
        "pago" => [
            "metodo" => null,       // "tarjeta" | "mercadopago" | null
            "titular" => null,      // nombre del titular (solo si tarjeta)
            "ultimos4" => null,     // últimos 4 dígitos (solo si tarjeta)
            "vencimiento" => null   // MM/AA (solo si tarjeta)
        ]
    ]);

    enviarMailBienvenida($email, $nombre);
    error_log("Se debería enviar mail de bienvenida a $email");

    echo json_encode(["ok" => true, "id" => $idUsuario]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $stmt = $pdo->prepare("SELECT id, nombre, password_hash, rol FROM usuarios WHERE email = ?");    $stmt->execute([$email]);
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
        "rol" => $user['rol'], // <-- AÑADIDO
        "mongo" => $mongoUser
    ]);
    exit;
}


// ============================================
// GOOGLE LOGIN ✅ COMPLETO
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'google-login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $token = $data['token'] ?? null;

    if (!$token) {
        echo json_encode(["error" => "Token no recibido"]);
        exit;
    }

    $CLIENT_ID = "342902827600-gafqbggc11nsh2uqeue9t2v7gvb2s5ra.apps.googleusercontent.com";
    $client = new Google\Client();
    $client->setClientId($CLIENT_ID);

    try {
        $payload = $client->verifyIdToken($token);
        if (!$payload) {
            echo json_encode(["error" => "Token inválido"]);
            exit;
        }

        $email = $payload['email'];
        $nombre = $payload['name'];
        $foto = $payload['picture'] ?? null;
        $google_id = $payload['sub'];

        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ? OR google_id = ?");
        $stmt->execute([$email, $google_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $nuevoUsuario = false;

        if (!$user) {
            // Crear usuario nuevo con Google
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, google_id, rol, estado) VALUES (?, ?, ?, 'cliente', 1)");
            $stmt->execute([$nombre, $email, $google_id]);
            $idUsuario = $pdo->lastInsertId();

            $mongoDB->usuarios_datos->insertOne([
                "id_usuario" => intval($idUsuario),
                "favoritos" => [],
                "carrito" => [],
                "direcciones" => [],
                "envioSeleccionado" => null,
                "pago" => null
            ]);

            enviarMailBienvenida($email, $nombre);
            $nuevoUsuario = true;

            $user = [
                "id" => $idUsuario,
                "nombre" => $nombre,
                "email" => $email,
                "rol" => "cliente"
            ];
        }

        $mongoUser = $mongoDB->usuarios_datos->findOne(["id_usuario" => intval($user['id'])]);

        echo json_encode([
            "ok" => true,
            "nuevo" => $nuevoUsuario,
            "id" => $user['id'],
            "nombre" => $user['nombre'],
            "email" => $user['email'],
            "rol" => $user['rol'],
            "foto" => $foto,
            "mongo" => $mongoUser
        ]);
        exit;

    } catch (Exception $e) {
        echo json_encode(["error" => "Fallo Google Login: " . $e->getMessage()]);
        exit;
    }
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

// === Obtener carrito ===
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'getCart') {
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

    echo json_encode($mongoUser["carrito"] ?? []);
    exit;
}

// === Direcciones: domicilios ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'saveDomicilio') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $domicilio = $data['domicilio'] ?? null;

    if (!$idUsuario || !$domicilio) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    if (empty($domicilio['id'])) {
        $domicilio['id'] = uniqid("dir");
    }
    if (!isset($domicilio['seleccionada'])) {
        $domicilio['seleccionada'] = false;
    }

    // Reemplazar si existe, o agregar si es nuevo
    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$pull' => ["direcciones.domicilios" => ["id" => $domicilio['id']]]]
    );
    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$push' => ["direcciones.domicilios" => $domicilio]]
    );

    echo json_encode(["ok" => true, "domicilio" => $domicilio]);
    exit;
}

// Seleccionar domicilio
if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && $_GET['action'] === 'selectDomicilio') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $idDireccion = $data['id_direccion'] ?? '';

    if (!$idUsuario || !$idDireccion) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    // Poner todos en false
    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => ["direcciones.domicilios.$[].seleccionada" => false]]
    );

    // Poner el elegido en true
    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario, "direcciones.domicilios.id" => $idDireccion],
        ['$set' => ["direcciones.domicilios.$.seleccionada" => true]]
    );

    echo json_encode(["ok" => true]);
    exit;
}

// === Direcciones: punto de retiro ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'savePunto') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $punto = $data['punto'] ?? null;

    if (!$idUsuario || !$punto) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    $punto['seleccionado'] = true;

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => ["direcciones.punto" => $punto]]
    );

    echo json_encode(["ok" => true, "punto" => $punto]);
    exit;
}

// === Seleccionar modalidad de envío ===
if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && $_GET['action'] === 'setEnvioSeleccionado') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $metodo = $data['metodo'] ?? null; // "domicilio", "punto" o "tienda"

    if (!$idUsuario || !$metodo) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => ["envioSeleccionado" => $metodo]]
    );

    echo json_encode(["ok" => true]);
    exit;
}

// === Obtener direcciones ===
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'getDirecciones') {
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

    echo json_encode($mongoUser["direcciones"] ?? []);
    exit;
}

// === Eliminar domicilio ===
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $_GET['action'] === 'deleteDomicilio') {
    $idUsuario = intval($_GET['id_usuario'] ?? 0);
    $idDireccion = $_GET['id_direccion'] ?? '';

    if (!$idUsuario || !$idDireccion) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$pull' => ["direcciones.domicilios" => ["id" => $idDireccion]]]
    );

    echo json_encode(["ok" => true]);
    exit;
}

// === Guardar método de pago ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'savePago') {
    $data = json_decode(file_get_contents("php://input"), true);
    $idUsuario = intval($data['id_usuario'] ?? 0);
    $pago = $data['pago'] ?? null;

    if (!$idUsuario || !$pago) {
        http_response_code(400);
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    $mongoDB->usuarios_datos->updateOne(
        ["id_usuario" => $idUsuario],
        ['$set' => [
            "pago.metodo" => $pago['metodo'],
            "pago.titular" => $pago['titular'] ?? null,
            "pago.ultimos4" => $pago['ultimos4'] ?? null,
            "pago.vencimiento" => $pago['vencimiento'] ?? null
        ]]
    );

    echo json_encode(["ok" => true]);
    exit;
}


// ============================================
// --- RECUPERAR CONTRASEÑA
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'forgot-password') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = trim($data['email'] ?? '');

    if (!$email) {
        echo json_encode(["error" => "Email requerido"]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, nombre FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["error" => "No existe un usuario con ese email"]);
        exit;
    }

    $token = bin2hex(random_bytes(32));
    $expires = date("Y-m-d H:i:s", strtotime("+1 hour"));

    $stmt = $pdo->prepare("UPDATE usuarios SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?");
    $stmt->execute([$token, $expires, $user['id']]);

    $link = "http://localhost/Muta/reset_password.html?token=".$token;

    enviarMailRecuperar($email, $user['nombre'], $link);

    echo json_encode(["ok" => true, "message" => "Te enviamos un email con instrucciones"]);
    exit;
}


// ============================================
// RESET PASSWORD (cambiar la contraseña con el token)
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_GET['action'] === 'reset-password') {
    $data = json_decode(file_get_contents("php://input"), true);
    $token = trim($data['token'] ?? '');
    $password = trim($data['password'] ?? '');

    if (!$token || !$password) {
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    // Buscar el token en la base de datos
    $stmt = $pdo->prepare("SELECT id, reset_token_expires_at FROM usuarios WHERE reset_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["error" => "Token inválido"]);
        exit;
    }

    // Verificar que el token no haya expirado
    $now = date('Y-m-d H:i:s');
    if ($now > $user['reset_token_expires_at']) {
        echo json_encode(["error" => "El token ha expirado. Solicitá uno nuevo."]);
        exit;
    }

    // Hashear la nueva contraseña
    $hash = password_hash($password, PASSWORD_BCRYPT);

    // Actualizar la contraseña y limpiar el token
    $stmt = $pdo->prepare("UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?");
    $stmt->execute([$hash, $user['id']]);

    echo json_encode(["ok" => true, "message" => "Contraseña actualizada correctamente"]);
    exit;
}



