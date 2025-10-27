<?php
// backend/setup_pedidos.php
// Script para crear la colección de pedidos e índices en MongoDB
// EJECUTAR UNA SOLA VEZ

require_once 'config.php';

try {
    // Conectar a MongoDB
    $client = new MongoDB\Client("mongodb://localhost:27017");
    $db = $client->ecommerce;
    
    echo "🔧 Configurando colección de pedidos...\n\n";
    
    // Crear colección si no existe
    try {
        $db->createCollection('pedidos');
        echo "✅ Colección 'pedidos' creada\n";
    } catch (Exception $e) {
        echo "ℹ️  Colección 'pedidos' ya existe\n";
    }
    
    $collection = $db->pedidos;
    
    // Crear índices
    echo "\n📊 Creando índices...\n";
    
    // Índice por usuario
    $collection->createIndex(['usuario_id' => 1]);
    echo "✅ Índice por usuario_id creado\n";
    
    // Índice único por número de pedido
    $collection->createIndex(
        ['numero_pedido' => 1],
        ['unique' => true]
    );
    echo "✅ Índice único por numero_pedido creado\n";
    
    // Índice por estado
    $collection->createIndex(['estado' => 1]);
    echo "✅ Índice por estado creado\n";
    
    // Índice por fecha
    $collection->createIndex(['fecha_compra' => -1]);
    echo "✅ Índice por fecha_compra creado\n";
    
    // Índice compuesto
    $collection->createIndex([
        'usuario_id' => 1,
        'estado' => 1,
        'fecha_compra' => -1
    ]);
    echo "✅ Índice compuesto creado\n";
    
    // Insertar pedido de ejemplo
    echo "\n📦 Insertando pedido de ejemplo...\n";
    
    $pedidoEjemplo = [
        'usuario_id' => 'user_123456',
        'numero_pedido' => 'MUTA-2025-00001',
        'fecha_compra' => new MongoDB\BSON\UTCDateTime(),
        'productos' => [
            [
                'producto_id' => 'prod_001',
                'nombre' => 'Remera Básica Blanca',
                'cantidad' => 2,
                'precio_unitario' => 15000,
                'talle' => 'M',
                'color' => 'Blanco',
                'subtotal' => 30000
            ],
            [
                'producto_id' => 'prod_002',
                'nombre' => 'Jean Azul Claro',
                'cantidad' => 1,
                'precio_unitario' => 42000,
                'talle' => '32',
                'color' => 'Azul',
                'subtotal' => 42000
            ]
        ],
        'direccion_envio' => [
            'calle' => 'San Martín 1234',
            'ciudad' => 'Mendoza',
            'provincia' => 'Mendoza',
            'codigo_postal' => '5500',
            'pais' => 'Argentina',
            'referencia' => 'Depto 2B',
            'telefono' => '+54 261 1234567'
        ],
        'subtotal' => 72000,
        'costo_envio' => 3000,
        'descuento' => 0,
        'total' => 75000,
        'estado' => 'en_espera',
        'metodo_pago' => 'tarjeta',
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
        'notas_cliente' => 'Llamar antes de entregar',
        'notas_admin' => '',
        'creado_en' => new MongoDB\BSON\UTCDateTime(),
        'actualizado_en' => new MongoDB\BSON\UTCDateTime()
    ];
    
    $result = $collection->insertOne($pedidoEjemplo);
    echo "✅ Pedido de ejemplo insertado con ID: " . $result->getInsertedId() . "\n";
    
    // Insertar más pedidos de ejemplo con diferentes estados
    $estadosEjemplo = ['pagado', 'enviado', 'recibido'];
    for ($i = 2; $i <= 4; $i++) {
        $pedido = $pedidoEjemplo;
        $pedido['numero_pedido'] = "MUTA-2025-" . str_pad($i, 5, '0', STR_PAD_LEFT);
        $pedido['usuario_id'] = 'user_' . rand(100000, 999999);
        $pedido['estado'] = $estadosEjemplo[$i - 2];
        $pedido['total'] = rand(20000, 100000);
        
        $collection->insertOne($pedido);
    }
    
    echo "✅ " . ($i - 1) . " pedidos adicionales insertados\n";
    
    echo "\n🎉 ¡Configuración completada exitosamente!\n";
    echo "📊 Total de pedidos: " . $collection->countDocuments() . "\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>