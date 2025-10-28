<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . "/configUsuarios/mongoUS.php";

header("Content-Type: application/json; charset=UTF-8");

// ============================================
// LISTAR PUNTOS DE RETIRO (activos)
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['action'])) {
    try {
        $puntos = $mongoDB->puntos_retiro->find(
            ['activo' => true],
            ['sort' => ['nombre' => 1]]
        )->toArray();
        
        // Convertir ObjectId a string para el frontend
        foreach ($puntos as &$punto) {
            $punto['id'] = (string) $punto['_id'];
            unset($punto['_id']);
        }
        
        echo json_encode([
            "ok" => true,
            "puntos" => $puntos
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error al obtener puntos de retiro: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => "Error al obtener puntos de retiro"
        ]);
    }
    exit;
}

// ============================================
// CREAR NUEVO PUNTO DE RETIRO
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_GET['action'])) {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON inválido");
        }
        
        $nombre = trim($data['nombre'] ?? '');
        $direccion = trim($data['direccion'] ?? '');
        $ciudad = trim($data['ciudad'] ?? '');
        $horario = trim($data['horario'] ?? '');
        $notas = trim($data['notas'] ?? '');
        
        if (!$nombre || !$direccion) {
            throw new Exception("Nombre y dirección son obligatorios");
        }
        
        $documento = [
            'nombre' => $nombre,
            'direccion' => $direccion,
            'ciudad' => $ciudad,
            'horario' => $horario,
            'notas' => $notas,
            'activo' => true,
            'fecha_creacion' => new MongoDB\BSON\UTCDateTime(),
            'fecha_modificacion' => new MongoDB\BSON\UTCDateTime()
        ];
        
        $result = $mongoDB->puntos_retiro->insertOne($documento);
        $id = (string) $result->getInsertedId();
        
        error_log("Punto de retiro creado en MongoDB: ID $id - $nombre");
        
        echo json_encode([
            "ok" => true,
            "id" => $id,
            "message" => "Punto de retiro creado exitosamente"
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        error_log("Error al crear punto de retiro: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => $e->getMessage()
        ]);
    }
    exit;
}

// ============================================
// ACTUALIZAR PUNTO DE RETIRO
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON inválido");
        }
        
        $id = trim($data['id'] ?? '');
        $nombre = trim($data['nombre'] ?? '');
        $direccion = trim($data['direccion'] ?? '');
        $ciudad = trim($data['ciudad'] ?? '');
        $horario = trim($data['horario'] ?? '');
        $notas = trim($data['notas'] ?? '');
        
        if (!$id || !$nombre || !$direccion) {
            throw new Exception("ID, nombre y dirección son obligatorios");
        }
        
        // Convertir string ID a ObjectId
        $objectId = new MongoDB\BSON\ObjectId($id);
        
        $result = $mongoDB->puntos_retiro->updateOne(
            ['_id' => $objectId],
            ['$set' => [
                'nombre' => $nombre,
                'direccion' => $direccion,
                'ciudad' => $ciudad,
                'horario' => $horario,
                'notas' => $notas,
                'fecha_modificacion' => new MongoDB\BSON\UTCDateTime()
            ]]
        );
        
        if ($result->getModifiedCount() === 0 && $result->getMatchedCount() === 0) {
            throw new Exception("Punto de retiro no encontrado");
        }
        
        error_log("Punto de retiro actualizado en MongoDB: ID $id");
        
        echo json_encode([
            "ok" => true,
            "message" => "Punto de retiro actualizado exitosamente"
        ]);
    } catch (MongoDB\Driver\Exception\InvalidArgumentException $e) {
        http_response_code(400);
        error_log("ID inválido: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => "ID de punto de retiro inválido"
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        error_log("Error al actualizar punto de retiro: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => $e->getMessage()
        ]);
    }
    exit;
}

// ============================================
// ELIMINAR (desactivar) PUNTO DE RETIRO
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $id = trim($_GET['id'] ?? '');
        
        if (!$id) {
            throw new Exception("ID requerido");
        }
        
        // Convertir string ID a ObjectId
        $objectId = new MongoDB\BSON\ObjectId($id);
        
        // Soft delete: cambiar activo a false en lugar de eliminar
        $result = $mongoDB->puntos_retiro->updateOne(
            ['_id' => $objectId],
            ['$set' => [
                'activo' => false,
                'fecha_modificacion' => new MongoDB\BSON\UTCDateTime()
            ]]
        );
        
        if ($result->getModifiedCount() === 0 && $result->getMatchedCount() === 0) {
            throw new Exception("Punto de retiro no encontrado");
        }
        
        error_log("Punto de retiro eliminado (desactivado) en MongoDB: ID $id");
        
        echo json_encode([
            "ok" => true,
            "message" => "Punto de retiro eliminado exitosamente"
        ]);
    } catch (MongoDB\Driver\Exception\InvalidArgumentException $e) {
        http_response_code(400);
        error_log("ID inválido: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => "ID de punto de retiro inválido"
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        error_log("Error al eliminar punto de retiro: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => $e->getMessage()
        ]);
    }
    exit;
}

// ============================================
// ACTIVAR/DESACTIVAR PUNTO
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'PATCH' && isset($_GET['action']) && $_GET['action'] === 'toggle') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("JSON inválido");
        }
        
        $id = trim($data['id'] ?? '');
        $activo = (bool) ($data['activo'] ?? false);
        
        if (!$id) {
            throw new Exception("ID requerido");
        }
        
        // Convertir string ID a ObjectId
        $objectId = new MongoDB\BSON\ObjectId($id);
        
        $result = $mongoDB->puntos_retiro->updateOne(
            ['_id' => $objectId],
            ['$set' => [
                'activo' => $activo,
                'fecha_modificacion' => new MongoDB\BSON\UTCDateTime()
            ]]
        );
        
        if ($result->getModifiedCount() === 0 && $result->getMatchedCount() === 0) {
            throw new Exception("Punto de retiro no encontrado");
        }
        
        error_log("Estado del punto de retiro cambiado en MongoDB: ID $id - Activo: " . ($activo ? 'true' : 'false'));
        
        echo json_encode([
            "ok" => true,
            "message" => "Estado actualizado"
        ]);
    } catch (MongoDB\Driver\Exception\InvalidArgumentException $e) {
        http_response_code(400);
        error_log("ID inválido: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => "ID de punto de retiro inválido"
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        error_log("Error al cambiar estado: " . $e->getMessage());
        echo json_encode([
            "ok" => false,
            "error" => $e->getMessage()
        ]);
    }
    exit;
}

// ============================================
// MÉTODO NO PERMITIDO
// ============================================
http_response_code(405);
error_log("Método HTTP no permitido: " . $_SERVER['REQUEST_METHOD']);
echo json_encode([
    "ok" => false,
    "error" => "Método no permitido"
]);