<?php
require 'config.php'; // conexión MongoDB
header("Content-Type: application/json; charset=UTF-8");

try {
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
            // =======================
            // LISTAR PRODUCTOS (GET)
            // =======================
            case 'GET':
                if (!empty($_GET['id'])) {
                    $id = $_GET['id'];
                    $producto = $mongoDB->products->findOne(["_id" => new MongoDB\BSON\ObjectId($id)]);
                    if ($producto) {
                        $producto["_id"] = (string)$producto["_id"];
                        echo json_encode($producto, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode(["error" => "Producto no encontrado"]);
                    }
                } else {
                    $productos = $mongoDB->products->find()->toArray();
                    $productos = array_map(function ($p) {
                        $p["_id"] = (string)$p["_id"];
                        return $p;
                    }, $productos);
                    echo json_encode($productos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                }
                break;

            // =======================
            // CREAR PRODUCTO (POST)
            // =======================
            case 'POST':
                $imagenes = [];
                // Si viene como form-data (con imágenes)
                if (!empty($_FILES['formFileMultiple']['name'][0])) {
                    $uploadDir = __DIR__ . "/../uploads/";
                    if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);

                    foreach ($_FILES['formFileMultiple']['tmp_name'] as $i => $tmpName) {
                        $fileName = time() . "_" . basename($_FILES['formFileMultiple']['name'][$i]);
                        $filePath = $uploadDir . $fileName;
                        if (move_uploaded_file($tmpName, $filePath)) {
                            $imagenes[] = "uploads/" . $fileName; // ruta relativa
                        }
                    }
                } 
                // 2) Fuente de datos: JSON o form-data
                $raw = file_get_contents('php://input');
                $maybeJson = json_decode($raw, true);
                $src = is_array($maybeJson) ? $maybeJson : $_POST;

                // helper: devuelve siempre un array plano
                $norm = function($v) {
                if ($v === null) return [];
                if (is_array($v)) return array_values($v);   // asegura índices 0..n
                return [$v];                                 // valor suelto -> [valor]
                };
                // --- variantes ---
                $talles = $norm($src['talle'] ?? $src['talles'] ?? null);
                $stocks = $norm($src['stock'] ?? null);
                $pesos  = $norm($src['peso']  ?? null);
                $colors = $norm($src['color'] ?? null);

                $variantes = [];
                $max = max(count($talles), count($stocks), count($pesos), count($colors));
                for ($i = 0; $i < $max; $i++) {
                    $t = $talles[$i] ?? null;
                    if ($t === null || $t === '') continue;
                    $variantes[] = [
                        'talle' => $t,
                        'stock' => isset($stocks[$i]) ? (int)$stocks[$i] : 0,
                        'peso'  => isset($pesos[$i])  ? (float)$pesos[$i]  : 0.0,
                        'color' => $colors[$i] ?? '#000000',
                    ];
                }

                // Lee tipo de variante (usar $src porque puede venir JSON o form-data)
                $tipoVariante = strtolower(trim($src['tipoVariante'] ?? 'remera'));

                // Categoría: si viene vacía, usar por defecto según el tipo
                $cat = trim($src['categoria'] ?? '');
                if ($cat === '') {
                    // Soporta "pantalon" / "pantalón"
                    $cat = in_array($tipoVariante, ['pantalon','pantalón']) ? 'pantalones' : 'remeras';
                }

                // Subcategoría opcional (también desde $src)
                $subcat = trim($src['subcategoria'] ?? '');

                // stock total
                $stockTotal = array_sum(array_map(fn($v) => (int)($v['stock'] ?? 0), $variantes));

                $nuevo = [
                    "nombre"        => $src["nombre"]        ?? "",
                    "descripcion"   => $src["descripcion"]   ?? "",
                    "precio"        => (int)($src["precio"] ?? 0),
                    "precioPromo"   => (int)($src["precioPromo"] ?? 0),
                    "costo"         => (int)($src["costo"]  ?? 0),
                    "categoria"     => $cat,        // <- siempre seteado
                    "subcategoria"  => $subcat,     // <- usar el saneado
                    "tipoVariante"  => $tipoVariante, // <- opcional, útil para futuras vistas
                    "imagenes"      => !empty($imagenes) ? $imagenes : ($src['imagenes'] ?? []),
                    "variantes"     => $variantes,
                    "stock"         => $stockTotal,
                    "estado"        => $src["estado"] ?? "Activo",
                    "fechaAlta"     => date("Y-m-d H:i:s"),
                ];


                $mongoDB->products->insertOne($nuevo);
                echo json_encode(["message" => "✅ Producto agregado"]);
                break;

                // =======================
                // EDITAR PRODUCTO (PUT)
                // =======================
                case 'PUT':
                    parse_str($_SERVER["QUERY_STRING"], $params);
                    $id = $params["id"] ?? null;

                    if (!$id) {
                        http_response_code(400);
                        echo json_encode(["error" => "ID requerido"]);
                        exit;
                    }

                    $data = json_decode(file_get_contents("php://input"), true) ?? [];

                    // Si viene 'variantes' como array en el JSON, recalculamos stock total
                    if (isset($data['variantes']) && is_array($data['variantes'])) {
                        // normalizar campos numéricos
                        $data['variantes'] = array_map(function($v){
                            return [
                                "talle" => $v['talle'] ?? '',
                                "stock" => (int)($v['stock'] ?? 0),
                                "peso"  => (float)($v['peso'] ?? 0),
                                "color" => $v['color'] ?? '#000000',
                            ];
                        }, $data['variantes']);

                        $data['stock'] = array_sum(array_map(fn($v) => (int)($v['stock'] ?? 0), $data['variantes']));
                    }

                    // Nunca permitir cambiar el _id
                    unset($data['_id']);

                    $mongoDB->products->updateOne(
                        ["_id" => new MongoDB\BSON\ObjectId($id)],
                        ['$set' => $data]
                    );

                    echo json_encode(["message" => "✏️ Producto actualizado"]);
                    break;

        // =======================
        // ELIMINAR PRODUCTO (DELETE)
        // =======================
        case 'DELETE':
            parse_str($_SERVER["QUERY_STRING"], $params);
            $id = $params["id"] ?? null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(["error" => "ID requerido"]);
                exit;
            }

            $mongoDB->products->deleteOne(["_id" => new MongoDB\BSON\ObjectId($id)]);
            echo json_encode(["message" => "🗑️ Producto eliminado"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Método no permitido"]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error en servidor", "detalle" => $e->getMessage()]);
}
