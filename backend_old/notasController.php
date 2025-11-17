<?php
require 'config.php';
header("Content-Type: application/json; charset=UTF-8");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ========= Helper ========= */
function bsonToArray($doc) {
    if ($doc instanceof MongoDB\Model\BSONDocument) {
        $doc = $doc->getArrayCopy();
    }
    if (isset($doc['_id'])) {
        $doc['_id'] = (string)$doc['_id'];
    }
    return $doc;
}

/* ========= Router ========= */
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'listar';
    
    $notasCol = $db->notas;
    
    // Crear índice por fecha
    try {
        $notasCol->createIndex(['fecha' => 1]);
        $notasCol->createIndex(['usuario_id' => 1]);
    } catch (Exception $e) {}
    
    switch ($method) {
        /* ===== GET ===== */
        case 'GET':
            
            // Listar todas las notas
            if ($action === 'listar') {
                $userId = $_GET['usuario_id'] ?? null;
                
                $filtro = [];
                if ($userId) {
                    $filtro['usuario_id'] = $userId;
                }
                
                $cursor = $notasCol->find($filtro, ['sort' => ['fecha' => 1]]);
                $notas = [];
                
                foreach ($cursor as $nota) {
                    $notas[] = bsonToArray($nota);
                }
                
                echo json_encode([
                    'success' => true,
                    'notas' => $notas
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // Obtener nota por fecha específica
            if ($action === 'obtener_por_fecha') {
                $fecha = $_GET['fecha'] ?? null;
                $userId = $_GET['usuario_id'] ?? null;
                
                if (!$fecha) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Fecha requerida']);
                    exit;
                }
                
                $filtro = ['fecha' => $fecha];
                if ($userId) {
                    $filtro['usuario_id'] = $userId;
                }
                
                $nota = $notasCol->findOne($filtro);
                
                if ($nota) {
                    echo json_encode([
                        'success' => true,
                        'nota' => bsonToArray($nota)
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    echo json_encode([
                        'success' => false,
                        'nota' => null
                    ]);
                }
                exit;
            }
            
            break;
            
        /* ===== POST - Crear o actualizar nota ===== */
        case 'POST':
            if ($action === 'guardar') {
                $data = json_decode(file_get_contents('php://input'), true);
                
                $fecha = $data['fecha'] ?? null;
                $texto = $data['texto'] ?? '';
                $userId = $data['usuario_id'] ?? 'admin';
                
                if (!$fecha || !$texto) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Fecha y texto son requeridos'
                    ]);
                    exit;
                }
                
                // Verificar si ya existe una nota para esa fecha
                $existe = $notasCol->findOne([
                    'fecha' => $fecha,
                    'usuario_id' => $userId
                ]);
                
                if ($existe) {
                    // Actualizar nota existente
                    $notasCol->updateOne(
                        ['_id' => $existe['_id']],
                        ['$set' => [
                            'texto' => trim($texto),
                            'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                        ]]
                    );
                    
                    echo json_encode([
                        'success' => true,
                        'message' => '✅ Nota actualizada',
                        'nota_id' => (string)$existe['_id']
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    // Crear nueva nota
                    $nuevaNota = [
                        'fecha' => $fecha,
                        'texto' => trim($texto),
                        'usuario_id' => $userId,
                        'creado_en' => new MongoDB\BSON\UTCDateTime(),
                        'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                    ];
                    
                    $result = $notasCol->insertOne($nuevaNota);
                    
                    echo json_encode([
                        'success' => true,
                        'message' => '✅ Nota guardada',
                        'nota_id' => (string)$result->getInsertedId()
                    ], JSON_UNESCAPED_UNICODE);
                }
                exit;
            }
            break;
            
        /* ===== DELETE - Eliminar nota ===== */
        case 'DELETE':
            if ($action === 'eliminar') {
                parse_str($_SERVER['QUERY_STRING'], $params);
                $id = $params['id'] ?? null;
                
                if (!$id) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'ID requerido']);
                    exit;
                }
                
                try {
                    $result = $notasCol->deleteOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
                    
                    if ($result->getDeletedCount() > 0) {
                        echo json_encode([
                            'success' => true,
                            'message' => '✅ Nota eliminada'
                        ]);
                    } else {
                        echo json_encode([
                            'success' => false,
                            'error' => 'Nota no encontrada'
                        ]);
                    }
                } catch (Exception $e) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'ID inválido']);
                }
                exit;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no permitido']);
            exit;
    }
    
} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log("Error MongoDB: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de base de datos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Error general: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en el servidor: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>