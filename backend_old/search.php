<?php
// backend/search.php - API de búsqueda para MUTA
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Incluir conexión a MongoDB
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';
 
try {
    $collection = $mongoDB->products;
   // Obtener parámetros de búsqueda
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

    // Validar que haya una búsqueda
    if (empty($query)) {
        echo json_encode([
            'success' => false,
            'message' => 'Debe proporcionar un término de búsqueda',
            'results' => []
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Esto evita que caracteres como '.' o '+' rompan la expresión regular
    $regex_query = preg_quote($query, '/');
    $bson_regex = new MongoDB\BSON\Regex($regex_query, 'i');

    $filter = [];

    // Primero, definimos la búsqueda por texto
    $text_search = [
        '$or' => [
            ['nombre' => $bson_regex],
            ['descripcion' => $bson_regex],
            ['tags' => $bson_regex] // Buscamos en 'tags'
        ]
    ];

    // Ahora, combinamos la búsqueda por texto y la categoría
    if (!empty($category) && $category !== 'all') {
        // Lógica A: El usuario especificó una categoría.
        // Buscamos con (TEXTO) Y (CATEGORÍA EXACTA)
        $filter = [
            '$and' => [
                ['categoria' => $category], // Filtro exacto de categoría
                $text_search                 // Filtro de texto
            ]
        ];
    } else {
        // Lógica B: El usuario NO especificó categoría.
        // Buscamos en (TEXTO) O (CATEGORÍA CON REGEX)
        $text_search['$or'][] = ['categoria' => $bson_regex];
        $filter = $text_search;
    }
    
    // Opciones de búsqueda (sin cambios)
    $options = [
        'limit' => $limit,
        'projection' => [
            'nombre' => 1,
            'categoria' => 1,
            'precio' => 1,
            'imagenes' => 1,
            'descripcion' => 1,
            'stock' => 1
        ]
    ];

    // Ejecutar búsqueda
    $cursor = $collection->find($filter, $options);
    $products = iterator_to_array($cursor);

    // Formatear resultados (sin cambios)
    $results = [];
    foreach ($products as $producto) {
        $results[] = [
            'id' => (string)$producto['_id'],
            'nombre' => $producto['nombre'],
            'categoria' => $producto['categoria'] ?? '',
            'precio' => $producto['precio'] ?? 0,
            'imagen' => $producto['imagenes'][0] ?? 'img/default.jpg',
            'descripcion' => isset($producto['descripcion']) ? 
                             substr($producto['descripcion'], 0, 100) . '...' : '',
            'stock' => $producto['stock'] ?? 0
        ];
    }

    // Respuesta JSON
    echo json_encode([
        'success' => true,
        'total' => count($results),
        'query' => $query,
        'filter_debug' => $filter, // <-- Útil para depurar
        'results' => $results
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error en la búsqueda: ' . $e->getMessage(),
        'results' => []
    ], JSON_UNESCAPED_UNICODE);
}
?>