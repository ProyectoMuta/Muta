<?php
require 'config.php';
// DEBUG temporal: inspeccionar estructura de uploads
error_log("DEBUG \$_FILES: " . print_r($_FILES, true));

header("Content-Type: application/json; charset=UTF-8");

/* ========= Helpers ========= */

function bsonToArray($doc) {
  if ($doc instanceof MongoDB\Model\BSONDocument) $doc = $doc->getArrayCopy();
  if (isset($doc['_id'])) $doc['_id'] = (string)$doc['_id'];
  return $doc;
}

const PRESET_CATEGORIES = ['remeras','pantalones','camperas','camisas','buzos','bermudas','vestidos','accesorios'];
const PRESET_SUBCATS    = ['CLASICAS','NOVEDADES','ESTILO MUTA','NUEVOS INGRESOS'];

const LIMITED_SUBS   = ['clasicas','novedades','estilo-muta']; // slugs
const MAX_SUB_ITEMS  = 8;

function slugify_local($s){
  $t = iconv('UTF-8','ASCII//TRANSLIT',$s);
  $t = preg_replace('~[^\\pL\\d]+~u','-',$t);
  $t = trim($t,'-');
  $t = strtolower($t);
  return preg_replace('~[^-a-z0-9]+~','',$t) ?: 'n-a';
}

function countCarouselItems($db, $catSlug, $subSlug){
  $q = [
    "eliminado"        => ['$ne'=>true],
    "estado"           => ['$in'=>["Activo","Bajo stock","Sin stock"]],
    "categoriaSlug"    => $catSlug,
    "subcategoriaSlug" => $subSlug,
  ];
  return $db->products->countDocuments($q);
}

/* ========= Bootstrap categorías (tabla categories_config) ========= */

$cfgCol = $db->selectCollection('categories_config');
$cfgCol->createIndex(['slug' => 1], ['unique' => true]);

function ensureDefaultCategories(\MongoDB\Collection $cfgCol){
  foreach (PRESET_CATEGORIES as $name){
    $slug = slugify_local($name);
    $cfgCol->updateOne(
      ['slug' => $slug],
      [
        '$setOnInsert' => [
          'nombre'  => ucfirst($name),
          'slug'    => $slug,
          'enabled' => true,
          'subs'    => array_map(fn($s)=>[
            'nombre'  => $s,
            'slug'    => slugify_local($s),
            'enabled' => true
          ], PRESET_SUBCATS),
        ],
      ],
      ['upsert' => true]
    );
  }
}

function dedupeBySlug(\MongoDB\Collection $col){
  $cursor = $col->aggregate([
    ['$sort'  => ['_id' => -1]],
    ['$group' => ['_id'=>'$slug','keep'=>['$first'=>'$_id'],'dups'=>['$push'=>'$_id']]]
  ]);
  $toDelete = [];
  foreach ($cursor as $g){
    $ids  = $g['dups'];
    $keep = (string)$g['keep'];
    foreach ($ids as $id){
      if ((string)$id !== $keep) $toDelete[] = $id;
    }
  }
  if ($toDelete){
    $col->deleteMany(['_id' => ['$in' => $toDelete]]);
  }
}

dedupeBySlug($cfgCol);
ensureDefaultCategories($cfgCol);

/* ========= Router ========= */
/* ======== Helpers de enabled ======== */
function getCatDoc(\MongoDB\Collection $cfgCol, string $catSlug) {
  return $cfgCol->findOne(['slug'=>$catSlug]);
}
function isCatEnabled(\MongoDB\Collection $cfgCol, string $catSlug): bool {
  if (!$catSlug) return false;
  $doc = getCatDoc($cfgCol, $catSlug);
  return $doc && !empty($doc['enabled']);
}
function isSubEnabled(\MongoDB\Collection $cfgCol, string $catSlug, string $subSlug): bool {
  if (!$catSlug || !$subSlug) return false;
  $doc = getCatDoc($cfgCol, $catSlug);
  if (!$doc || empty($doc['enabled'])) return false;
  foreach (($doc['subs'] ?? []) as $s) {
    if (slugify_local($s['nombre'] ?? '') === $subSlug) {
      return !empty($s['enabled']);
    }
  }
  return false;
}

function procesarImagenes(array $files, string $uploadDir): array {
  $imagenes = [];
  $errores  = [];

  if (!file_exists($uploadDir)) mkdir($uploadDir, 0777, true);

  $names = $files['name'];
  $tmps  = $files['tmp_name'];
  $errs  = $files['error'];

  for ($i = 0; $i < count($names); $i++) {
    $original = $names[$i];
    $tmp      = $tmps[$i];
    $error    = $errs[$i];

    // Validar extensión
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    $allowedExts = ['jpg','jpeg','png','webp'];
    if (!in_array($ext, $allowedExts)) {
      $errores[] = "Archivo '$original' descartado: extensión '$ext' no permitida";
      continue;
    }

    // Normalizar nombre
    $normalizado = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $original);
    if ($normalizado === false) $normalizado = $original;
    $normalizado = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $normalizado);

    if (trim($normalizado, '_') === '') {
      $normalizado = uniqid('img_') . '.' . $ext;
    }

    // Mover archivo
    if ($error === UPLOAD_ERR_OK && is_uploaded_file($tmp)) {
      $safeName = preg_replace('/\s+/', '_', basename($normalizado));
      $fileName = time() . "_$safeName";
      if (move_uploaded_file($tmp, $uploadDir . $fileName)) {
        $imagenes[] = "uploads/" . $fileName;
      } else {
        $errores[] = "Archivo '$original' falló al moverlo al destino";
      }
    } else {
      $errores[] = "Archivo '$original' no se pudo subir (error code $error)";
    }
  }

  return ['imagenes' => $imagenes, 'errores' => $errores];
}

try {
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['_method'])) {
    $_SERVER['REQUEST_METHOD'] = strtoupper($_POST['_method']);
  }
  $method = $_SERVER['REQUEST_METHOD'];
  switch ($method) {
    /* ===== GET ===== */
    case 'GET':
      // Listado de nuevos ingresos (opcional por categoría)
      if (isset($_GET['action']) && $_GET['action'] === 'new_arrivals') {
        $cat = $_GET['categoriaSlug'] ?? '';
        error_log("Categoría recibida: " . $cat);
        if ($cat && !isCatEnabled($cfgCol, $cat)) {
            echo json_encode(['items' => []]);
            exit;
        }
        $q = [
            'eliminado'   => ['$ne' => true],
            '$or' => [
                ['newArrival' => true],
                ['subcategoriaSlug' => 'nuevos-ingresos']
            ],
            'publicable'  => true
        ];
        if ($cat) {
            $q['categoriaSlug'] = $cat;
        }
        $cur = $db->products->find($q, ['sort' => ['_id' => -1], 'limit' => 24]);
        $items = [];
        foreach ($cur as $doc) {
            $arr = bsonToArray($doc);
            $cs = $arr['categoriaSlug'] ?? '';
            if ($cat && $cs !== $cat) {
                continue;
            }
            if ($cs && !isCatEnabled($cfgCol, $cs)) {
                continue;
            }
            $ss = $arr['subcategoriaSlug'] ?? '';
            if ($cs && $ss && !isSubEnabled($cfgCol, $cs, $ss)) {
                continue;
            }
            $items[] = $arr;
        }
        echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
        exit;
      }
      // Estado simple de una categoría (y sus subcats)
      if (isset($_GET['action']) && $_GET['action']==='cat_status') {
        $slug = slugify_local($_GET['slug'] ?? '');
        $doc  = $slug ? getCatDoc($cfgCol, $slug) : null;
        if (!$doc) { echo json_encode(['enabled'=>false,'subcats'=>[]]); exit; }
        $subs = [];
        foreach (($doc['subs'] ?? []) as $s) {
          $subs[] = [
            'name'    => $s['nombre'] ?? '',
            'slug'    => slugify_local($s['nombre'] ?? ''),
            'enabled' => !empty($s['enabled'])
          ];
        }
        echo json_encode([
          'enabled' => !empty($doc['enabled']),
          'subcats' => $subs
        ], JSON_UNESCAPED_UNICODE);
        exit;
      }
      // Conteo para validar topes desde el front
      if (isset($_GET['action']) && $_GET['action']==='count') {
        $cat  = $_GET['categoriaSlug']    ?? '';
        $sub  = $_GET['subcategoriaSlug'] ?? '';
        $tot  = ($cat && $sub) ? countCarouselItems($db, $cat, $sub) : 0;
        echo json_encode(["total"=>$tot], JSON_UNESCAPED_UNICODE);
        exit;
      }
      // Config de categorías/subs
      if (isset($_GET['action']) && $_GET['action'] === 'cats') {
        $docs = $cfgCol->find([], ['sort'=>['_id'=>-1]])->toArray();
        $bySlug = [];
        foreach ($docs as $d) {
          $arr = bsonToArray($d);
          $subsRaw = $arr['subs'] ?? [];
          if ($subsRaw instanceof \MongoDB\Model\BSONArray) $subsRaw = $subsRaw->getArrayCopy();
          elseif ($subsRaw instanceof \Traversable) $subsRaw = iterator_to_array($subsRaw, false);
          elseif (!is_array($subsRaw)) $subsRaw = [];
          $slug = $arr['slug'] ?? '';
          if ($slug==='' || isset($bySlug[$slug])) continue;
          $bySlug[$slug] = [
            'name'    => $arr['nombre'] ?? '',
            'slug'    => $slug,
            'enabled' => (bool)($arr['enabled'] ?? false),
            'subcats' => array_map(function($s){
              if ($s instanceof \MongoDB\Model\BSONDocument) $s = $s->getArrayCopy();
              return ['name'=>$s['nombre']??'', 'enabled'=>(bool)($s['enabled']??false)];
            }, $subsRaw),
          ];
        }
        echo json_encode(['categories' => array_values($bySlug)], JSON_UNESCAPED_UNICODE);
        exit;
      }
      // Listado paginado / filtrado
      if (isset($_GET['action']) && $_GET['action']==='list') {
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 24)));
        $skip  = max(0, (int)($_GET['skip'] ?? 0));
        $cat = $_GET['categoriaSlug']    ?? '';
        $sub = $_GET['subcategoriaSlug'] ?? '';
        //Admin: muestra todos los estados
        //Público (carrousels/listas): llamar con &public=1
        $isPublic = isset($_GET['public']) && $_GET['public']=='1';
        if ($isPublic) {
          $q = [
            "eliminado" => ['$ne' => true],
            "estado"    => ['$in' => ["Activo", "Bajo stock", "Sin stock"]],
            "publicable" => true
          ];
        } else {
          // 🔧 Admin: ver todo (incluye Pausado y Eliminado)
          $q = [];
        }
        if ($cat) $q['categoriaSlug'] = $cat;
        if ($sub) $q['subcategoriaSlug'] = $sub;
        // Respetar enabled solo si viene categoría/sub
        if ($cat && !isCatEnabled($cfgCol, $cat)) { echo json_encode(['items'=>[],'total'=>0]); exit; }
        if ($cat && $sub && !isSubEnabled($cfgCol, $cat, $sub)) { echo json_encode(['items'=>[],'total'=>0]); exit; }
        $total = $db->products->countDocuments($q);
        $cur   = $db->products->find($q, ['limit'=>$limit,'skip'=>$skip,'sort'=>['_id'=>-1]]);
        $items = array_map('bsonToArray', $cur->toArray());
        echo json_encode(['items'=>$items,'total'=>$total], JSON_UNESCAPED_UNICODE);
        exit;
      }

      // === Feed global para carrusel de novedades ===
      if (isset($_GET['action']) && $_GET['action'] === 'global_feed') {
          $q = [
              'eliminado'   => ['$ne' => true],
              'estado'      => ['$in' => ['Activo','Bajo stock','Sin stock']],
              'publicable'  => true
          ];

          // Traer hasta 10 productos más recientes
          $cur = $db->products->find($q, [
              'sort'  => ['_id' => -1],
              'limit' => 10
          ]);

          $items = [];
          foreach ($cur as $doc) {
              $items[] = bsonToArray($doc);
          }

          echo json_encode(['items' => $items], JSON_UNESCAPED_UNICODE);
          exit;
      }

      // Get por id
      if (!empty($_GET['id'])) {
        $id = $_GET['id'];
        $producto = $db->products->findOne(["_id" => new MongoDB\BSON\ObjectId($id)]);
        if ($producto) echo json_encode(bsonToArray($producto), JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
        else { http_response_code(404); echo json_encode(["error"=>"Producto no encontrado"]); }
        break;
      }

      // === Verificar stock de productos favoritos ===
      if (isset($_GET['action']) && $_GET['action'] === 'check_stock') {
          $ids = explode(',', $_GET['ids'] ?? '');
          $validIds = [];
          $invalidIds = [];

          foreach ($ids as $id) {
              try {
                  $doc = $db->products->findOne(
                      ["_id" => new MongoDB\BSON\ObjectId(trim($id))],
                      ['projection' => ['estado' => 1, 'eliminado' => 1]]
                  );
                  if ($doc && ($doc['eliminado'] ?? false) !== true) {
                      $estado = (string)($doc['estado'] ?? 'Activo');
                      if (in_array($estado, ["Activo", "Bajo stock", "Sin stock"])) {
                          $validIds[] = (string)$doc['_id'];
                      } else {
                          $invalidIds[] = (string)$doc['_id'];
                      }
                  } else {
                      $invalidIds[] = $id;
                  }
              } catch (Exception $e) {
                  $invalidIds[] = $id;
              }
          }

          echo json_encode([
              'validIds' => $validIds,
              'invalidIds' => $invalidIds
          ], JSON_UNESCAPED_UNICODE);
          exit;
      }

      // listados simples
      if (isset($_GET['publicList']) && $_GET['publicList']=='1') {
        $f = ["eliminado"=>['$ne'=>true], "estado"=>['$in'=>["Activo","Bajo stock","Sin stock"]]];
        $cur = $db->products->find($f);
        $out = [];
        foreach ($cur as $doc) {
          $arr = bsonToArray($doc);
          $cs = $arr['categoriaSlug'] ?? '';
          $ss = $arr['subcategoriaSlug'] ?? '';
          if ($cs && !isCatEnabled($cfgCol, $cs)) continue;
          if ($cs && $ss && !isSubEnabled($cfgCol, $cs, $ss)) continue;
          $out[] = $arr;
        }
        echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
      } else {
        $f = (isset($_GET['public']) && $_GET['public']=='1')
              ? ["publicable"=>true, "eliminado"=>['$ne'=>true]]
              : [];
        $cur = $db->products->find($f);
        $out = [];
        foreach ($cur as $doc) {
          $arr = bsonToArray($doc);
          $cs = $arr['categoriaSlug'] ?? '';
          $ss = $arr['subcategoriaSlug'] ?? '';
          if ($cs && !isCatEnabled($cfgCol, $cs)) continue;
          if ($cs && $ss && !isSubEnabled($cfgCol, $cs, $ss)) continue;
          $out[] = $arr;
        }
        echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
      }
      break;
      /* ===== POST (crear) ===== */
      case 'POST':
          // Subir imagen de categoría
          if (isset($_GET['action']) && $_GET['action'] === 'uploadCategoryImage') {
              if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
                  http_response_code(400);
                  echo json_encode(['ok' => false, 'error' => 'No se recibió imagen válida']);
                  exit;
              }

              $categoria_slug = $_POST['categoria_slug'] ?? '';
              if (!$categoria_slug) {
                  http_response_code(400);
                  echo json_encode(['ok' => false, 'error' => 'Falta categoria_slug']);
                  exit;
              }

              $uploadDir = __DIR__ . '/../uploads/categorias/';
              if (!file_exists($uploadDir)) {
                  mkdir($uploadDir, 0777, true);
              }

              $file = $_FILES['imagen'];
              $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
              $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

              if (!in_array($ext, $allowedExts)) {
                  http_response_code(400);
                  echo json_encode(['ok' => false, 'error' => 'Extensión no permitida']);
                  exit;
              }

              $fileName = 'categoria_' . $categoria_slug . '_' . time() . '.' . $ext;
              $targetPath = $uploadDir . $fileName;

              if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                  http_response_code(500);
                  echo json_encode(['ok' => false, 'error' => 'Error al mover archivo']);
                  exit;
              }

              $url = 'uploads/categorias/' . $fileName;

              // Actualizar en MongoDB
              $cfgCol->updateOne(
                  ['slug' => $categoria_slug],
                  ['$set' => ['imagen' => $url]],
                  ['upsert' => true]
              );

              echo json_encode(['ok' => true, 'url' => $url]);
              exit;
          }

          // guardar presets de categorías/subs
          if (isset($_GET['action']) && $_GET['action'] === 'catsSave') {
              $raw = file_get_contents('php://input');
              $data = json_decode($raw, true);
              if (!$data || !isset($data['categories']) || !is_array($data['categories'])) {
                http_response_code(400); echo json_encode(['error'=>'payload inválido']); exit;
              }
              foreach ($data['categories'] as $cat) {
                  $slug = slugify_local($cat['slug'] ?? ($cat['name'] ?? ''));
                  if (!$slug) continue;

                  $setData = [
                      'nombre'  => $cat['name'] ?? ucfirst($slug),
                      'enabled' => (bool)($cat['enabled'] ?? false),
                      'subs'    => array_map(fn($s)=>[
                        'nombre'  => $s['name'] ?? '',
                        'slug'    => slugify_local($s['name'] ?? ''),
                        'enabled' => (bool)($s['enabled'] ?? false),
                      ], ($cat['subcats'] ?? [])),
                  ];

                  // Agregar imagen si existe
                  if (isset($cat['imagen']) && $cat['imagen']) {
                      $setData['imagen'] = $cat['imagen'];
                  }

                  $cfgCol->updateOne(
                    ['slug'=>$slug],
                    ['$set'=> $setData],
                    ['upsert'=>true]
                  );
              }
              echo json_encode(['ok'=>true]); exit;
          }

          // toggle preset (rápido)
          if (isset($_POST['action']) && $_POST['action']==='togglePreset') {
            $catSlug = $_POST['categorySlug'] ?? '';
            $subSlug = $_POST['subSlug'] ?? '';
            $enabled = isset($_POST['enabled']) ? (bool)$_POST['enabled'] : true;
            if ($catSlug===''){ http_response_code(400); echo json_encode(['error'=>'categorySlug requerido']); exit; }
            if ($subSlug===''){
              $cfgCol->updateOne(['slug'=>$catSlug], ['$set'=>['enabled'=>$enabled]]);
            } else {
              $cfgCol->updateOne(['slug'=>$catSlug,'subs.slug'=>$subSlug], ['$set'=>['subs.$.enabled'=>$enabled]]);
            }
            echo json_encode(['message'=>'✅ Preset actualizado']); exit;
          }

          // ------- crear producto --------
          $existing  = [];
          if (isset($_POST['existingImages'])) {
            $existing = json_decode($_POST['existingImages'], true) ?: [];
          }

          $uploadDir = __DIR__ . "/../uploads/";
          $imagenes  = [];

          if (!empty($_FILES['formFileMultiple']['name'][0])) {
            $resultado = procesarImagenes($_FILES['formFileMultiple'], $uploadDir);
            $imagenes  = $resultado['imagenes'];
            $errores   = $resultado['errores'];
          } else {
            $imagenes = [];
            $errores  = [];
          }

          // 🚨 Validación final
          if (empty($imagenes)) {
              http_response_code(400);
              echo json_encode([
                  'error'   => "Debe subir al menos una imagen válida. Extensiones permitidas: jpg, jpeg, png, webp",
                  'detalles'=> $errores
              ], JSON_UNESCAPED_UNICODE);
              exit;
          }

          $imagenes = array_slice(array_merge($existing, $imagenes), 0, 3);

          $raw = file_get_contents('php://input');
          $maybeJson = json_decode($raw, true);
          $src = is_array($maybeJson) ? $maybeJson : $_POST;

          $norm = function($v){ if ($v===null) return []; if (is_array($v)) return array_values($v); return [$v]; };
          $talles = $norm($src['talle'] ?? $src['talles'] ?? null);
          $stocks = $norm($src['stock'] ?? null);
          $pesos  = $norm($src['peso']  ?? null);

          // Manejo de colores con fallback negro
          $colorsRaw = $src['color'] ?? $src['color[]'] ?? null;
          if ($colorsRaw === null) {
              $colors = ['#000000'];
          } else {
              $colors = $norm($colorsRaw);
              if (empty($colors)) $colors = ['#000000'];
          }

          $variantes = [];
          $max = max(count($talles), count($stocks), count($pesos), count($colors));
          for ($i=0; $i<$max; $i++) {
            $t = $talles[$i] ?? null;
            if ($t===null || $t==='') continue;
            $variantes[] = [
              'talle' => $t,
              'stock' => isset($stocks[$i]) ? (int)$stocks[$i] : 0,
              'peso'  => isset($pesos[$i])  ? (float)$pesos[$i] : 0.0,
              'color' => $colors[$i] ?? '#000000', // fallback negro
            ];
          }

          $tipoVariante = strtolower(trim($src['tipoVariante'] ?? 'remera'));
          $catNameIn = trim($src['categoria'] ?? '');
          if ($catNameIn==='') $catNameIn = in_array($tipoVariante, ['pantalon','pantalón']) ? 'pantalones' : 'remeras';
          $subNameIn = trim($src['subcategoria'] ?? '');
          $catDoc = $cfgCol->findOne(['slug'=>slugify_local($catNameIn)]);
          if (!$catDoc || !$catDoc['enabled']) {
            $catDoc = $cfgCol->findOne(['slug'=>'remeras','enabled'=>true]) ?: $cfgCol->findOne(['enabled'=>true]);
            if (!$catDoc) { http_response_code(400); echo json_encode(['error'=>'No hay categorías habilitadas']); exit; }
          }
          $catName = $catDoc['nombre'];  $catSlug = $catDoc['slug'];
          $subSlug = null; $subNameOut = '';
          if ($subNameIn!==''){
            $sub = null;
            foreach ($catDoc['subs'] as $s){ if (slugify_local($s['nombre'])===slugify_local($subNameIn)) { $sub=$s; break; } }
            if (!$sub || !$sub['enabled']) { http_response_code(400); echo json_encode(['error'=>'Subcategoría no habilitada']); exit; }
            $subNameOut = $sub['nombre']; $subSlug = $sub['slug'];
          }

          $stockTotal = array_sum(array_map(fn($v)=>(int)($v['stock']??0), $variantes));
          $estado     = (string)($src["estado"] ?? "Activo");
          $publicable = in_array($estado, ["Activo","Bajo stock"], true) && ($stockTotal > 0);

          // IDs (opcional, por compatibilidad)
          $catId = null; $subId = null;

          // Tope 8 (sólo remeras + sub limitada)
          if ($subSlug && in_array($subSlug, LIMITED_SUBS, true)) {
            $current = countCarouselItems($db, $catSlug, $subSlug);
              if ($current >= MAX_SUB_ITEMS) {
                http_response_code(409);
                echo json_encode([
                "error" => "carrusel_lleno",
                "message" => "El carrusel de '".$subNameOut."' en '".$catName."' ya tiene el máximo de ".MAX_SUB_ITEMS." productos. Elimina uno para poder agregar otro."
                ], JSON_UNESCAPED_UNICODE);
              exit;
            }
          }

          $newArrival = filter_var(($src['newArrival'] ?? $src['nuevoIngreso'] ?? false), FILTER_VALIDATE_BOOLEAN);

          $nuevo = [
            "nombre"            => $src["nombre"] ?? "",
            "descripcion"       => $src["descripcion"] ?? "",
            "precio"            => (int)($src["precio"] ?? 0),
            "precioPromo"       => (int)($src["precioPromo"] ?? 0),
            "costo"             => (int)($src["costo"] ?? 0),
            "tipoVariante"      => $tipoVariante,
            "categoria"         => $catName,
            "subcategoria"      => $subNameOut,
            "categoriaId"       => $catId,
            "subcategoriaId"    => $subId,
            "categoriaSlug"     => $catSlug,
            "subcategoriaSlug"  => $subSlug,
            "imagenes"          => $imagenes,
            "variantes"         => $variantes,
            "stock"             => $stockTotal,
            "estado"            => $estado,
            "publicable"        => $publicable,
            "eliminado"         => false,
            "fechaAlta"         => date("c"),
            "newArrival"        => (bool)$newArrival,
          ];

              // 🔑 Eliminar campos sueltos de color para que no se guarden duplicados
              unset($nuevo['color'], $nuevo['color[]']);

              // Obligatorios básicos
              foreach (['nombre','descripcion','precio','costo','estado'] as $k){
                if (($nuevo[$k]??'')===''){
                  http_response_code(400);
                  echo json_encode(['error'=>"Campo obligatorio faltante: $k"]);
                  exit;
                }
              }

              if (empty($variantes)){
                http_response_code(400);
                echo json_encode(['error'=>'Debe agregar al menos 1 variante']);
                exit;
              }

              // Insertar en Mongo
              $db->products->insertOne($nuevo);

              echo json_encode(["message"=>"✅ Producto agregado"]);
              break;

          /* ===== PUT (editar) ===== */
          case 'PUT':
              parse_str($_SERVER["QUERY_STRING"], $params);
              $id = $params["id"] ?? null;
              if (!$id) { 
                  http_response_code(400); 
                  echo json_encode(["error"=>"ID requerido"]); 
                  exit; 
              }

              $docEstado = $db->products->findOne(
                  ["_id"=>new MongoDB\BSON\ObjectId($id)], 
                  ['projection'=>['estado'=>1,'eliminado'=>1]]
              );
              if ($docEstado && ((string)($docEstado['estado']??'')==='Eliminado' || ($docEstado['eliminado']??false)===true)){
                  http_response_code(403); 
                  echo json_encode(["error"=>"Producto eliminado: no puede editarse"]); 
                  exit;
              }

              $isOverride = !empty($_POST);
              $data = $isOverride ? $_POST : (json_decode(file_get_contents("php://input"), true) ?? []);

              // Procesar nuevas imágenes si se subieron
              $nuevas = [];
              if ($isOverride && isset($_FILES['formFileMultiple'])) {
                  $uploadDir = __DIR__ . "/../uploads/";
                  $resultado = procesarImagenes($_FILES['formFileMultiple'], $uploadDir);
                  $nuevas = $resultado['imagenes'] ?? [];
              }

              // Decodificar existingImages correctamente
              $existingRaw = $data['existingImages'] ?? '[]';
              if (is_string($existingRaw)) {
                  $existing = json_decode($existingRaw, true) ?: [];
              } elseif (is_array($existingRaw)) {
                  $existing = $existingRaw;
              } else {
                  $existing = [];
              }

              // Validación: debe haber al menos una imagen
              if (empty($existing) && empty($nuevas)) {
                  http_response_code(400);
                  echo json_encode([
                      'error' => "Debe mantener al menos una imagen existente o subir una nueva válida. Extensiones permitidas: jpg, jpeg, png, webp"
                  ]);
                  exit;
              }

              // Combinar imágenes existentes + nuevas
              if (!empty($existing) || !empty($nuevas)) {
                  $data['imagenes'] = array_slice(array_merge($existing, $nuevas), 0, 3);
              }

              // Reconstruir variantes si no vienen como array
              if (!isset($data['variantes']) || !is_array($data['variantes'])) {
                  $norm = function($v){ if ($v===null) return []; if (is_array($v)) return array_values($v); return [$v]; };
                  $talles = $norm($data['talle'] ?? $data['talles'] ?? null);
                  $stocks = $norm($data['stock'] ?? null);
                  $pesos  = $norm($data['peso']  ?? null);
                  $colors = $norm($data['color'] ?? $data['color[]'] ?? null);

                  $variantes = [];
                  $max = max(count($talles), count($stocks), count($pesos), count($colors));
                  for ($i=0; $i<$max; $i++) {
                      $t = $talles[$i] ?? null;
                      if ($t===null || $t==='') continue;
                      $variantes[] = [
                          'talle' => $t,
                          'stock' => isset($stocks[$i]) ? (int)$stocks[$i] : 0,
                          'peso'  => isset($pesos[$i])  ? (float)$pesos[$i] : 0.0,
                          'color' => $colors[$i] ?? '#000000', // fallback negro
                      ];
                  }
                  if (!empty($variantes)) {
                      $data['variantes'] = $variantes;
                      $data['stock'] = array_sum(array_map(fn($v)=>(int)($v['stock']??0), $variantes));
                  }
              }

              // 🔑 Eliminar campos sueltos de color para que no se guarden duplicados
              unset($data['color'], $data['color[]']);

              if (isset($data['estado'])) $data['estado'] = (string)$data['estado'];

              $docActual = $db->products->findOne(["_id" => new MongoDB\BSON\ObjectId($id)]) ?? [];

              // Tope de 8 en carruseles limitados
              $nuevoCatSlug = $data['categoriaSlug']    ?? ($docActual['categoriaSlug']    ?? null);
              $nuevoSubSlug = $data['subcategoriaSlug'] ?? ($docActual['subcategoriaSlug'] ?? null);
              $antesCat = $docActual['categoriaSlug']    ?? null;
              $antesSub = $docActual['subcategoriaSlug'] ?? null;
              $cambiaDeCarrusel = ($nuevoCatSlug !== $antesCat) || ($nuevoSubSlug !== $antesSub);
              if ($cambiaDeCarrusel && $nuevoSubSlug && in_array($nuevoSubSlug, LIMITED_SUBS, true)) {
                  $current = countCarouselItems($db, 'remeras', $nuevoSubSlug);
                  if ($current >= MAX_SUB_ITEMS) {
                      http_response_code(409);
                      echo json_encode([
                          "error"   => "carrusel_lleno",
                          "message" => "El carrusel de '".$nuevoSubSlug."' ya tiene el máximo de ".MAX_SUB_ITEMS." productos. Elimina uno para poder agregar otro."
                      ], JSON_UNESCAPED_UNICODE);
                      exit;
                  }
              }

              $stockTotal = isset($data['stock']) ? (int)$data['stock'] : (int)($docActual['stock'] ?? 0);
              $estadoCalc = $data['estado'] ?? (string)($docActual['estado'] ?? 'Activo');
              $publicable = in_array($estadoCalc, ["Activo","Bajo stock"], true) && ($stockTotal > 0);

              unset($data['_id']);
              if (isset($data['newArrival'])) {
                  $data['newArrival'] = filter_var($data['newArrival'], FILTER_VALIDATE_BOOLEAN);
              }

              $db->products->updateOne(
                  ["_id" => new MongoDB\BSON\ObjectId($id)],
                  ['$set' => $data]
              );

              echo json_encode([
                  "message" => "Producto actualizado",
                  "event" => "producto:actualizado",
                  "productId" => $id
              ]);
              break;
      }
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(["error"=>"Error en servidor","detalle"=>$e->getMessage()]);
}
