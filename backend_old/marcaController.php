<?php
require 'config.php';
header("Content-Type: application/json; charset=UTF-8");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ========= Helper para convertir BSON ========= */
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
    $action = $_GET['action'] ?? 'obtener';
    
    // Colección de marca (solo habrá un documento)
    $marcaCol = $db->marca;
    
    switch ($method) {
        /* ===== GET - Obtener información de la marca ===== */
        case 'GET':
            if ($action === 'obtener') {
                // Buscar el documento de la marca (solo debería haber uno)
                $marca = $marcaCol->findOne();
                
                if ($marca) {
                    echo json_encode([
                        'success' => true,
                        'marca' => bsonToArray($marca)
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                } else {
                    // Si no existe, devolver valores por defecto
                    echo json_encode([
                        'success' => true,
                        'marca' => [
                            'nombre' => 'MUTA',
                            'descripcion' => 'Descripción de la marca no configurada aún.'
                        ]
                    ], JSON_UNESCAPED_UNICODE);
                }
                exit;
            }
            break;
            
        /* ===== POST - Crear o actualizar información de la marca ===== */
        case 'POST':
            if ($action === 'guardar') {
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Validaciones
                if (empty($data['nombre']) || empty($data['descripcion'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Nombre y descripción son requeridos'
                    ]);
                    exit;
                }
                
                $marcaData = [
                    'nombre' => trim($data['nombre']),
                    'descripcion' => trim($data['descripcion']),
                    'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                ];
                
                // Verificar si ya existe un documento
                $existe = $marcaCol->findOne();
                
                if ($existe) {
                    // Actualizar el existente
                    $marcaCol->updateOne(
                        ['_id' => $existe['_id']],
                        ['$set' => $marcaData]
                    );
                    
                    echo json_encode([
                        'success' => true,
                        'message' => '✅ Marca actualizada correctamente',
                        'marca' => $marcaData
                    ], JSON_UNESCAPED_UNICODE);
                } else {
                    // Crear nuevo documento
                    $marcaData['creado_en'] = new MongoDB\BSON\UTCDateTime();
                    $result = $marcaCol->insertOne($marcaData);
                    
                    echo json_encode([
                        'success' => true,
                        'message' => '✅ Marca guardada correctamente',
                        'marca_id' => (string)$result->getInsertedId(),
                        'marca' => $marcaData
                    ], JSON_UNESCAPED_UNICODE);
                }
                exit;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Método no permitido'
            ]);
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