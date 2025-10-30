<?php
require 'config.php';
header("Content-Type: application/json; charset=UTF-8");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
    // Convertir fechas UTC a string legible
    foreach ($doc as $key => $val) {
        if ($val instanceof MongoDB\BSON\UTCDateTime) {
            $doc[$key] = $val->toDateTime()->format('Y-m-d H:i:s');
        }
    }
    return $doc;
}

/* ========= Generar número de pedido único ========= */
function generarNumeroPedido($db) {
    $year = date('Y');
    
    // Buscar el último pedido del año actual
    $ultimoPedido = $db->pedidos->findOne(
        ['numero_pedido' => new MongoDB\BSON\Regex("^MUTA-$year-", 'i')],
        ['sort' => ['numero_pedido' => -1]]
    );
    
    $numeroSecuencia = 1;
    
    if ($ultimoPedido && isset($ultimoPedido['numero_pedido'])) {
        preg_match('/MUTA-\d{4}-(\d+)/', $ultimoPedido['numero_pedido'], $matches);
        if (isset($matches[1])) {
            $numeroSecuencia = (int)$matches[1] + 1;
        }
    }
    
    return sprintf('MUTA-%s-%05d', $year, $numeroSecuencia);
}

/* ========= Router ========= */
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? 'listar';
    
    // Colección de pedidos
    $pedidosCol = $db->pedidos;
    
    // Crear índices si no existen
    try {
        $pedidosCol->createIndex(['usuario_id' => 1]);
        $pedidosCol->createIndex(['numero_pedido' => 1], ['unique' => true]);
        $pedidosCol->createIndex(['estado' => 1]);
        $pedidosCol->createIndex(['fecha_compra' => -1]);
    } catch (Exception $e) {
        // Índices ya existen
    }
    
    switch ($method) {
        /* ===== GET ===== */
        case 'GET':
            
            // ============================================
            // LISTAR PEDIDOS
            // ============================================
            if ($action === 'listar' || $action === 'listar_usuario') {
                $filtro = [];

                // Filtrar por usuario
                if (isset($_GET['usuario_id']) && $_GET['usuario_id'] !== '') {
                    $filtro['usuario_id'] = $_GET['usuario_id'];
                }

                // Filtrar por estado
                if (isset($_GET['estado']) && $_GET['estado'] !== 'todos' && $_GET['estado'] !== '') {
                    $filtro['estado'] = $_GET['estado'];
                }

                // Buscar por número de pedido
                if (isset($_GET['buscar']) && $_GET['buscar'] !== '') {
                    $filtro['numero_pedido'] = new MongoDB\BSON\Regex($_GET['buscar'], 'i');
                }

                // Paginación
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                $skip = isset($_GET['skip']) ? (int)$_GET['skip'] : 0;

                $opciones = [
                    'sort' => ['fecha_compra' => -1],
                    'limit' => $limit,
                    'skip' => $skip
                ];

                $cursor = $pedidosCol->find($filtro, $opciones);
                $pedidos = [];

                foreach ($cursor as $pedido) {
                    $pedidos[] = bsonToArray($pedido);
                }

                $total = $pedidosCol->countDocuments($filtro);

                echo json_encode([
                    'success' => true,
                    'total' => $total,
                    'pedidos' => $pedidos
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
            
            // ============================================
            // OBTENER UN PEDIDO POR ID
            // ============================================
            if ($action === 'obtener') {
                $id = $_GET['id'] ?? null;
                
                if (!$id) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'ID de pedido requerido'
                    ]);
                    exit;
                }
                
                try {
                    $pedido = $pedidosCol->findOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
                    
                    if (!$pedido) {
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'error' => 'Pedido no encontrado'
                        ]);
                        exit;
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'pedido' => bsonToArray($pedido)
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                    
                } catch (Exception $e) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'ID inválido'
                    ]);
                }
                exit;
            }
            
            // ============================================
            // OBTENER PEDIDOS POR USUARIO
            // ============================================
            if ($action === 'por_usuario') {
                $userId = $_GET['usuario_id'] ?? null;
                
                if (!$userId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'usuario_id requerido'
                    ]);
                    exit;
                }
                
                $cursor = $pedidosCol->find(
                    ['usuario_id' => $userId],
                    ['sort' => ['fecha_compra' => -1]]
                );
                
                $pedidos = [];
                foreach ($cursor as $pedido) {
                    $pedidos[] = bsonToArray($pedido);
                }
                
                echo json_encode([
                    'success' => true,
                    'pedidos' => $pedidos
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
            
            break;
            
        /* ===== POST (Crear pedido) ===== */
        case 'POST':
            
            if ($action === 'crear') {
                $data = json_decode(file_get_contents('php://input'), true);
                
                // Validaciones
                if (empty($data['usuario_id'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'usuario_id es requerido'
                    ]);
                    exit;
                }
                
                if (empty($data['productos']) || !is_array($data['productos'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'productos es requerido y debe ser un array'
                    ]);
                    exit;
                }
                
                if (empty($data['direccion_envio'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'direccion_envio es requerida'
                    ]);
                    exit;
                }
                
                // Generar número de pedido único
                $numeroPedido = generarNumeroPedido($db);
                
                // Calcular totales
                $subtotal = 0;
                foreach ($data['productos'] as $prod) {
                    $subtotal += (float)($prod['subtotal'] ?? 0);
                }
                
                $costoEnvio = (float)($data['costo_envio'] ?? 0);
                $descuento = (float)($data['descuento'] ?? 0);
                $total = $subtotal + $costoEnvio - $descuento;
                
                // Crear documento del pedido
                $nuevoPedido = [
                    'usuario_id' => $data['usuario_id'],
                    'numero_pedido' => $numeroPedido,
                    'fecha_compra' => new MongoDB\BSON\UTCDateTime(),
                    'productos' => $data['productos'],
                    'direccion_envio' => $data['direccion_envio'],
                    'subtotal' => $subtotal,
                    'costo_envio' => $costoEnvio,
                    'descuento' => $descuento,
                    'total' => $total,
                    'estado' => 'en_espera',
                    'metodo_pago' => $data['metodo_pago'] ?? 'mercadopago',
                    'estado_pago' => 'pendiente',
                    'numero_tracking' => null,
                    'fecha_pago' => null,
                    'fecha_envio' => null,
                    'fecha_entrega' => null,
                    'historial' => [
                        [
                            'estado' => 'en_espera',
                            'fecha' => new MongoDB\BSON\UTCDateTime(),
                            'nota' => 'Pedido creado'
                        ]
                    ],
                    'notas_cliente' => $data['notas_cliente'] ?? '',
                    'notas_admin' => '',
                    'creado_en' => new MongoDB\BSON\UTCDateTime(),
                    'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                ];
                
                try {
                    $result = $pedidosCol->insertOne($nuevoPedido);
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Pedido creado exitosamente',
                        'pedido_id' => (string)$result->getInsertedId(),
                        'numero_pedido' => $numeroPedido
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                    
                } catch (MongoDB\Driver\Exception\Exception $e) {
                    error_log("Error creando pedido: " . $e->getMessage());
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Error al crear el pedido: ' . $e->getMessage()
                    ]);
                }
                exit;
            }
            
            break;
            
        /* ===== PUT (Actualizar pedido) ===== */
        case 'PUT':
            
            if ($action === 'actualizar_estado') {
                $data = json_decode(file_get_contents('php://input'), true);
                
                if (empty($data['id']) || empty($data['estado'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'id y estado son requeridos'
                    ]);
                    exit;
                }
                
                $estadosValidos = ['en_espera', 'pagado', 'enviado', 'recibido', 'cancelado'];
                
                if (!in_array($data['estado'], $estadosValidos)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Estado inválido. Valores permitidos: ' . implode(', ', $estadosValidos)
                    ]);
                    exit;
                }
                
                $actualizacion = [
                    'estado' => $data['estado'],
                    'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                ];
                
                // Actualizar campos según el estado
                if ($data['estado'] === 'pagado') {
                    $actualizacion['fecha_pago'] = new MongoDB\BSON\UTCDateTime();
                    $actualizacion['estado_pago'] = 'aprobado';
                }
                
                if ($data['estado'] === 'enviado') {
                    $actualizacion['fecha_envio'] = new MongoDB\BSON\UTCDateTime();
                    if (!empty($data['numero_tracking'])) {
                        $actualizacion['numero_tracking'] = $data['numero_tracking'];
                    }
                }
                
                if ($data['estado'] === 'recibido') {
                    $actualizacion['fecha_entrega'] = new MongoDB\BSON\UTCDateTime();
                }
                
                try {
                    $pedidosCol->updateOne(
                        ['_id' => new MongoDB\BSON\ObjectId($data['id'])],
                        [
                            '$set' => $actualizacion,
                            '$push' => [
                                'historial' => [
                                    'estado' => $data['estado'],
                                    'fecha' => new MongoDB\BSON\UTCDateTime(),
                                    'nota' => $data['nota'] ?? 'Estado actualizado'
                                ]
                            ]
                        ]
                    );
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Estado del pedido actualizado exitosamente'
                    ], JSON_UNESCAPED_UNICODE);
                    
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Error al actualizar el pedido: ' . $e->getMessage()
                    ]);
                }
                exit;
            }
            
            break;
            
        /* ===== DELETE ===== */
        case 'DELETE':
            // Por ahora no permitimos eliminar pedidos, solo cancelar
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'No se permite eliminar pedidos. Use la acción actualizar_estado con estado "cancelado".'
            ]);
            exit;
            
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