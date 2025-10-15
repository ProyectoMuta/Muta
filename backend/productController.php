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
                    $producto = $db->products->findOne(["_id" => new MongoDB\BSON\ObjectId($id)]);
                    if ($producto) {
                        $producto["_id"] = (string)$producto["_id"];
                        echo json_encode($producto, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(404);
                        echo json_encode(["error" => "Producto no encontrado"]);
                    }
                } else {
                    $productos = $db->products->find()->toArray();
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
                // Si viene como form-data (con imágenes)
                if (!empty($_FILES['formFileMultiple']['name'][0])) {
                    $imagenes = [];
                    $uploadDir = __DIR__ . "/../uploads/";

                    if (!file_exists($uploadDir)) {
                        mkdir($uploadDir, 0777, true);
                    }

                    foreach ($_FILES['formFileMultiple']['tmp_name'] as $i => $tmpName) {
                        $fileName = time() . "_" . basename($_FILES['formFileMultiple']['name'][$i]);
                        $filePath = $uploadDir . $fileName;

                        if (move_uploaded_file($tmpName, $filePath)) {
                            $imagenes[] = "uploads/" . $fileName; // guardamos ruta relativa
                        }
                    }
                } else {
                    $imagenes = [];
                }
                // --- Variantes (acepta array o escalar) ---
                $asArray = function($v) {
                    if (is_array($v)) return $v;
                    if ($v === null || $v === '') return [];
                    return [$v];
                };

                $talles = $asArray($_POST['talle'] ?? []);
                $stocks = $asArray($_POST['stock'] ?? []);
                $pesos  = $asArray($_POST['peso']  ?? []);
                $colors = $asArray($_POST['color'] ?? []);


                //variantes
                $variantes = [];
                if (isset($_POST['talle']) && is_array($_POST['talle'])) {
                    $talles = $_POST['talle'];
                    $stocks = $_POST['stock'] ?? [];
                    $pesos  = $_POST['peso']  ?? [];
                    $colors = $_POST['color'] ?? [];
                    foreach ($talles as $i => $talle) {
                        $variantes[] = [
                            "talle" => $talle,
                            "stock" => (int)($stocks[$i] ?? 0),
                            "peso"  => (float)($pesos[$i] ?? 0),
                            "color" => $colors[$i] ?? "#000000",
                        ];
                    }
                }
                // stock total
                $stockTotal = array_sum(array_map(fn($v) => (int)($v['stock'] ?? 0), $variantes));
        
                $nuevo = [
                    "nombre"      => $_POST["nombre"] ?? "",
                    "descripcion" => $_POST["descripcion"] ?? "",
                    "precio"      => (int)($_POST["precio"] ?? 0),
                    "precioPromo" => (int)($_POST["precioPromo"] ?? 0),
                    "costo"       => (int)($_POST["costo"] ?? 0),
                    "categoria"   => $_POST["categoria"] ?? "remeras",
                    "subcategoria"=> $_POST["subcategoria"] ?? "",
                    "imagenes"    => $imagenes,
                    "variantes"   => $variantes,           
                    "stock"       => $stockTotal,          
                    "estado"      => $_POST["estado"] ?? "Activo",
                    "fechaAlta"   => date("Y-m-d H:i:s")
                ];

                $db->products->insertOne($nuevo);
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

                    $db->products->updateOne(
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

            $db->products->deleteOne(["_id" => new MongoDB\BSON\ObjectId($id)]);
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
