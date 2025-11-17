<?php
require 'config.php';
header("Content-Type: application/json; charset=UTF-8");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $action = $_GET['action'] ?? 'estadisticas';
    $pedidosCol = $db->pedidos;
    
    /* ============================================
       ESTADÍSTICAS DE VENTAS POR RANGO
       ============================================ */
    if ($action === 'estadisticas') {
        $dias = isset($_GET['dias']) ? (int)$_GET['dias'] : 30;
        $dias = max(1, min(365, $dias)); // Entre 1 y 365 días
        
        // Calcular fecha de inicio
        $fechaInicio = new DateTime();
        $fechaInicio->modify("-{$dias} days");
        $fechaInicio->setTime(0, 0, 0);
        
        // Filtro de fecha
        $filtro = [
            'fecha_compra' => [
                '$gte' => new MongoDB\BSON\UTCDateTime($fechaInicio->getTimestamp() * 1000)
            ],
            'estado' => ['$in' => ['pagado', 'enviado', 'recibido']] // Solo pedidos efectivos
        ];
        
        // Obtener pedidos
        $cursor = $pedidosCol->find($filtro, ['sort' => ['fecha_compra' => 1]]);
        $pedidos = iterator_to_array($cursor);
        
        // Agrupar por día
        $ventasPorDia = [];
        $hoy = new DateTime();
        
        // Inicializar todos los días con 0
        for ($i = $dias - 1; $i >= 0; $i--) {
            $fecha = clone $hoy;
            $fecha->modify("-{$i} days");
            $key = $fecha->format('Y-m-d');
            $ventasPorDia[$key] = [
                'fecha' => $fecha->format('d/m'),
                'total' => 0,
                'cantidad_pedidos' => 0
            ];
        }
        
        // Sumar ventas por día
        foreach ($pedidos as $pedido) {
            $fechaPedido = $pedido['fecha_compra']->toDateTime();
            $key = $fechaPedido->format('Y-m-d');
            
            if (isset($ventasPorDia[$key])) {
                $ventasPorDia[$key]['total'] += $pedido['total'];
                $ventasPorDia[$key]['cantidad_pedidos']++;
            }
        }
        
        // Convertir a array secuencial
        $datos = array_values($ventasPorDia);
        
        // Calcular estadísticas
        $totales = array_column($datos, 'total');
        $total_ventas = array_sum($totales);
        $promedio = $dias > 0 ? $total_ventas / $dias : 0;
        $max_dia = $totales ? max($totales) : 0;
        $total_pedidos = array_sum(array_column($datos, 'cantidad_pedidos'));
        
        echo json_encode([
            'success' => true,
            'dias' => $dias,
            'datos' => $datos,
            'estadisticas' => [
                'total_ventas' => round($total_ventas, 2),
                'promedio_diario' => round($promedio, 2),
                'mejor_dia' => round($max_dia, 2),
                'total_pedidos' => $total_pedidos
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /* ============================================
       PRODUCTOS MÁS VENDIDOS
       ============================================ */
    if ($action === 'productos_mas_vendidos') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
        
        // Agregación para contar productos vendidos
        $pipeline = [
            [
                '$match' => [
                    'estado' => ['$in' => ['pagado', 'enviado', 'recibido']]
                ]
            ],
            [
                '$unwind' => '$productos'
            ],
            [
                '$group' => [
                    '_id' => '$productos.producto_id',
                    'nombre' => ['$first' => '$productos.nombre'],
                    'cantidad_vendida' => ['$sum' => '$productos.cantidad'],
                    'total_ventas' => ['$sum' => '$productos.subtotal']
                ]
            ],
            [
                '$sort' => ['cantidad_vendida' => -1]
            ],
            [
                '$limit' => $limit
            ]
        ];
        
        $resultado = $pedidosCol->aggregate($pipeline);
        $productos = [];
        
        foreach ($resultado as $item) {
            $productos[] = [
                'producto_id' => (string)$item['_id'],
                'nombre' => $item['nombre'],
                'cantidad_vendida' => $item['cantidad_vendida'],
                'total_ventas' => round($item['total_ventas'], 2)
            ];
        }
        
        echo json_encode([
            'success' => true,
            'productos' => $productos
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /* ============================================
       VENTAS POR MÉTODO DE PAGO
       ============================================ */
    if ($action === 'por_metodo_pago') {
        $pipeline = [
            [
                '$match' => [
                    'estado' => ['$in' => ['pagado', 'enviado', 'recibido']]
                ]
            ],
            [
                '$group' => [
                    '_id' => '$metodo_pago',
                    'total' => ['$sum' => '$total'],
                    'cantidad' => ['$sum' => 1]
                ]
            ]
        ];
        
        $resultado = $pedidosCol->aggregate($pipeline);
        $metodos = [];
        
        foreach ($resultado as $item) {
            $metodos[] = [
                'metodo' => $item['_id'],
                'total' => round($item['total'], 2),
                'cantidad' => $item['cantidad']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'metodos' => $metodos
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    
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