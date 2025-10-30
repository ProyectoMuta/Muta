<?php
/**
 * Webhook de Mercado Pago
 *
 * Este archivo recibe las notificaciones (IPN) de Mercado Pago
 * cuando ocurre algún evento relacionado con un pago.
 *
 * Mercado Pago enviará una notificación POST a esta URL cuando:
 * - Se aprueba un pago
 * - Se rechaza un pago
 * - Hay una actualización en el estado del pago
 */

// Headers
header('Content-Type: application/json; charset=utf-8');

// Requerir archivos necesarios
require_once __DIR__ . '/mp-config.php';
require_once __DIR__ . '/config.php';

// Log de las notificaciones recibidas (útil para debugging)
$logFile = __DIR__ . '/logs/mp-notifications.log';

// Crear carpeta de logs si no existe
if (!file_exists(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0777, true);
}

/**
 * Registra información en el log
 */
function logNotificacion($mensaje) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $mensaje\n", FILE_APPEND);
}

/**
 * Valida la firma del webhook para asegurar que viene de Mercado Pago
 */
function validarFirmaWebhook() {
    // ⚠️ DESACTIVAR VALIDACIÓN TEMPORALMENTE PARA PRUEBAS
    logNotificacion("⚠️ VALIDACIÓN DE FIRMA DESACTIVADA - SOLO PARA PRUEBAS");
    return true;
    
    // Verificar si la clave secreta está configurada
    if (!defined('MP_WEBHOOK_SECRET') || empty(MP_WEBHOOK_SECRET)) {
        logNotificacion("ADVERTENCIA: Clave secreta del webhook no configurada. Saltando validación de firma.");
        return true;
    }

    // Obtener headers de la petición
    $xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? null;
    $xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? null;

    if (!$xSignature || !$xRequestId) {
        logNotificacion("ADVERTENCIA: No se recibieron headers de firma (x-signature o x-request-id)");
        return true; // Por ahora permitir sin firma (Mercado Pago no siempre la envía en sandbox)
    }

    // Separar el tipo de firma y el hash
    $parts = explode(',', $xSignature);
    $ts = null;
    $hash = null;

    foreach ($parts as $part) {
        $keyValue = explode('=', $part, 2);
        if (count($keyValue) === 2) {
            $key = trim($keyValue[0]);
            $value = trim($keyValue[1]);

            if ($key === 'ts') {
                $ts = $value;
            } elseif ($key === 'v1') {
                $hash = $value;
            }
        }
    }

    if (!$ts || !$hash) {
        logNotificacion("ADVERTENCIA: Firma incompleta (falta ts o v1)");
        return true;
    }

    // Obtener el data.id de diferentes posibles ubicaciones
    $input = file_get_contents('php://input');
    $postData = json_decode($input, true);

    // Intentar obtener el ID del recurso de múltiples fuentes
    $dataId = $_GET['data.id'] ??
              $_GET['id'] ??
              $_GET['data_id'] ??
              ($postData['data']['id'] ?? null) ??
              ($postData['id'] ?? null);

    if (!$dataId) {
        logNotificacion("ADVERTENCIA: No se pudo obtener data.id para validar firma");
        return true; // Permitir si no hay data.id
    }

    // Construir el manifest según la documentación oficial de Mercado Pago
    // Template: id:[data.id];request-id:[x-request-id];ts:[ts];
    $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";

    // Calcular el hash esperado
    $secret = MP_WEBHOOK_SECRET;
    $expectedHash = hash_hmac('sha256', $manifest, $secret);

    // Comparar hashes
    if (hash_equals($expectedHash, $hash)) {
        logNotificacion("✅ Firma del webhook validada correctamente");
        logNotificacion("   Manifest usado: {$manifest}");
        return true;
    }

    // Si no coincide, intentar sin el punto y coma final (algunas versiones de MP)
    $manifest2 = "id:{$dataId};request-id:{$xRequestId};ts:{$ts}";
    $expectedHash2 = hash_hmac('sha256', $manifest2, $secret);

    if (hash_equals($expectedHash2, $hash)) {
        logNotificacion("✅ Firma del webhook validada correctamente (formato sin ; final)");
        logNotificacion("   Manifest usado: {$manifest2}");
        return true;
    }

    // No coincide con ningún formato conocido
    logNotificacion("❌ ALERTA: Firma del webhook inválida. Posible intento de suplantación.");
    logNotificacion("   data.id usado: {$dataId}");
    logNotificacion("   x-request-id: {$xRequestId}");
    logNotificacion("   timestamp: {$ts}");
    logNotificacion("   Manifest probado 1: {$manifest}");
    logNotificacion("   Expected hash 1: {$expectedHash}");
    logNotificacion("   Manifest probado 2: {$manifest2}");
    logNotificacion("   Expected hash 2: {$expectedHash2}");
    logNotificacion("   Received hash: {$hash}");
    logNotificacion("   ⚠️ SUGERENCIA: Ejecuta backend/debug-webhook-firma.php para diagnosticar");
    return false;
}

/**
 * Obtiene los datos del webhook
 */
function obtenerDatosWebhook() {
    // Obtener datos del POST
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    // También obtener parámetros GET
    $params = $_GET;

    logNotificacion("Webhook recibido - GET: " . json_encode($params) . " | POST: " . $input);

    return ['data' => $data, 'params' => $params];
}

/**
 * Consulta el estado de un pago en Mercado Pago con reintentos
 */
function consultarPago($paymentId, $intentos = 3) {
    for ($i = 0; $i < $intentos; $i++) {
        // Esperar 2 segundos entre reintentos (excepto el primero)
        if ($i > 0) {
            logNotificacion("Reintentando consulta de pago {$paymentId} (intento " . ($i + 1) . "/{$intentos})");
            sleep(2);
        }

        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/payments/{$paymentId}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . MP_ACCESS_TOKEN,
            'Content-Type: application/json'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200) {
            logNotificacion("✅ Pago {$paymentId} consultado exitosamente");
            return json_decode($response, true);
        }

        // Log detallado del error
        $errorMsg = "Error al consultar pago {$paymentId}: HTTP {$httpCode}";
        if ($curlError) {
            $errorMsg .= " | cURL Error: {$curlError}";
        }
        if ($response) {
            $errorData = json_decode($response, true);
            if ($errorData) {
                $errorMsg .= " | Respuesta API: " . json_encode($errorData);
            }
        }
        logNotificacion($errorMsg);

        // Si es 404, continuar reintentando (el pago puede no estar indexado aún)
        if ($httpCode !== 404 && $i < $intentos - 1) {
            // Si no es 404, no tiene sentido reintentar
            break;
        }
    }

    logNotificacion("❌ No se pudo consultar el pago {$paymentId} después de {$intentos} intentos");
    return null;
}

/**
 * Consulta una orden de comercio (merchant_order) en Mercado Pago
 */
function consultarMerchantOrder($merchantOrderId) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/merchant_orders/{$merchantOrderId}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200) {
        logNotificacion("✅ Merchant Order {$merchantOrderId} consultada exitosamente");
        return json_decode($response, true);
    }

    $errorMsg = "Error al consultar merchant order {$merchantOrderId}: HTTP {$httpCode}";
    if ($curlError) {
        $errorMsg .= " | cURL Error: {$curlError}";
    }
    logNotificacion($errorMsg);

    return null;
}

/**
 * Procesa una merchant_order extrayendo sus pagos
 * Algunos medios de pago (Rapipago, PagoFácil) notifican primero merchant_order
 */
function procesarMerchantOrder($merchantOrderData) {
    if (!$merchantOrderData) {
        return false;
    }

    logNotificacion("📦 Procesando Merchant Order ID: {$merchantOrderData['id']}");

    // Obtener los pagos asociados a esta orden
    $payments = $merchantOrderData['payments'] ?? [];

    if (empty($payments)) {
        logNotificacion("⚠️ Merchant Order sin pagos asociados");
        return false;
    }

    // Procesar cada pago de la orden
    $processed = false;
    foreach ($payments as $payment) {
        $paymentId = $payment['id'] ?? null;
        $status = $payment['status'] ?? null;

        if (!$paymentId) {
            continue;
        }

        logNotificacion("💳 Payment en Merchant Order - ID: {$paymentId}, Status: {$status}");

        // Solo procesar pagos aprobados
        if ($status === 'approved') {
            // Consultar el pago completo para obtener todos los detalles
            $paymentData = consultarPago($paymentId);

            if ($paymentData) {
                actualizarEstadoPedido($paymentData);
                $processed = true;
            }
        } else {
            logNotificacion("ℹ️ Payment {$paymentId} con status '{$status}' - no se procesa aún");
        }
    }

    return $processed;
}

/**
 * Actualiza el estado del pedido en MongoDB según el resultado del pago
 */
function actualizarEstadoPedido($paymentData) {
    global $mongoClient;

    try {
        $db = $mongoClient->mutaDB;
        $pedidosCollection = $db->pedidos;

        // Obtener external_reference (número de pedido o ID)
        $externalReference = $paymentData['external_reference'] ?? null;

        if (!$externalReference) {
            logNotificacion("No se encontró external_reference en el pago");
            return false;
        }

        // Buscar el pedido
        $pedido = $pedidosCollection->findOne([
            'numero_pedido' => $externalReference
        ]);

        if (!$pedido) {
            logNotificacion("No se encontró pedido con numero_pedido: {$externalReference}");
            return false;
        }

        // 🔒 IDEMPOTENCIA: Verificar si este payment_id ya fue procesado
        $paymentId = $paymentData['id'];
        $paymentsProcessed = $pedido['mercadopago']['payments_procesados'] ?? [];

        if (in_array($paymentId, $paymentsProcessed)) {
            logNotificacion("⚠️ IDEMPOTENCIA: Payment ID {$paymentId} ya fue procesado para pedido {$externalReference}. Ignorando notificación duplicada.");
            return true; // No es error, simplemente ya se procesó
        }

        logNotificacion("✅ Payment ID {$paymentId} es nuevo. Procesando actualización del pedido {$externalReference}...");

        // Determinar el nuevo estado según el status de MP
        $estadoPago = 'pendiente';
        $estadoPedido = 'en_espera';

        switch ($paymentData['status']) {
            case 'approved':
                $estadoPago = 'aprobado';
                $estadoPedido = 'pagado';
                break;

            case 'rejected':
            case 'cancelled':
                $estadoPago = 'rechazado';
                $estadoPedido = 'cancelado';
                break;

            case 'pending':
            case 'in_process':
            case 'in_mediation':
                $estadoPago = 'pendiente';
                $estadoPedido = 'en_espera';
                break;

            case 'refunded':
            case 'charged_back':
                $estadoPago = 'reembolsado';
                $estadoPedido = 'cancelado';
                break;
        }

        // Preparar actualización
        $actualizacion = [
            '$set' => [
                'estado' => $estadoPedido,
                'estado_pago' => $estadoPago,
                'mercadopago.payment_id' => $paymentData['id'],
                'mercadopago.status' => $paymentData['status'],
                'mercadopago.status_detail' => $paymentData['status_detail'],
                'mercadopago.payment_type_id' => $paymentData['payment_type_id'],
                'mercadopago.payment_method_id' => $paymentData['payment_method_id'],
                'mercadopago.transaction_amount' => $paymentData['transaction_amount'],
                'mercadopago.date_approved' => isset($paymentData['date_approved']) ?
                    new MongoDB\BSON\UTCDateTime(strtotime($paymentData['date_approved']) * 1000) : null,
                'actualizado_en' => new MongoDB\BSON\UTCDateTime()
            ],
            '$push' => [
                'historial' => [
                    'estado' => $estadoPedido,
                    'fecha' => new MongoDB\BSON\UTCDateTime(),
                    'nota' => "Pago {$estadoPago} - MP Payment ID: {$paymentData['id']}"
                ]
            ],
            // 🔒 IDEMPOTENCIA: Agregar este payment_id a la lista de procesados
            '$addToSet' => [
                'mercadopago.payments_procesados' => $paymentId
            ]
        ];

        // Si el pago fue aprobado, guardar fecha de pago
        if ($estadoPago === 'aprobado') {
            $actualizacion['$set']['fecha_pago'] = new MongoDB\BSON\UTCDateTime();
        }

        // Actualizar el pedido
        $resultado = $pedidosCollection->updateOne(
            ['_id' => $pedido['_id']],
            $actualizacion
        );

        logNotificacion(
            "Pedido actualizado: {$externalReference} - " .
            "Estado: {$estadoPedido} - Payment ID: {$paymentData['id']}"
        );

        // Si el pago fue aprobado, descontar stock y enviar email
        if ($estadoPago === 'aprobado') {
            // Descontar stock de productos
            descontarStockProductos($pedido);

            // Enviar email de confirmación
            enviarEmailConfirmacionPago($pedido, $paymentData);
        }

        return $resultado->getModifiedCount() > 0;

    } catch (Exception $e) {
        logNotificacion("Error al actualizar pedido: " . $e->getMessage());
        return false;
    }
}

/**
 * Envía un email de confirmación cuando el pago es aprobado
 */
function enviarEmailConfirmacionPago($pedido, $paymentData) {
    // Aquí puedes integrar el envío de email
    // Por ahora solo logueamos
    logNotificacion(
        "Email de confirmación pendiente para pedido: " .
        $pedido['numero_pedido']
    );

    // TODO: Integrar con EmailJS o PHPMailer para enviar email de confirmación
}

/**
 * Descuenta el stock de los productos cuando el pago es aprobado
 */
function descontarStockProductos($pedido) {
    global $mongoClient;

    try {
        $db = $mongoClient->mutaDB;
        $productosCollection = $db->products;

        // Obtener lista de productos del pedido
        $productosPedido = $pedido['productos'] ?? [];

        if (empty($productosPedido)) {
            logNotificacion("No hay productos en el pedido para descontar stock");
            return false;
        }

        foreach ($productosPedido as $item) {
            $productoId = $item['producto_id'] ?? null;
            $cantidad = (int)($item['cantidad'] ?? 0);
            $talleComprado = $item['talle'] ?? null;

            if (!$productoId || $cantidad <= 0) {
                logNotificacion("Item inválido en pedido: sin producto_id o cantidad");
                continue;
            }

            // Buscar el producto en la base de datos
            try {
                $producto = $productosCollection->findOne([
                    '_id' => new MongoDB\BSON\ObjectId($productoId)
                ]);

                if (!$producto) {
                    logNotificacion("Producto no encontrado: {$productoId}");
                    continue;
                }

                $variantes = $producto['variantes'] ?? [];
                $stockActual = (int)($producto['stock'] ?? 0);

                // Actualizar stock en las variantes
                $variantesActualizadas = [];
                $stockDescontado = 0;

                foreach ($variantes as $variante) {
                    $talle = $variante['talle'] ?? null;
                    $stockVariante = (int)($variante['stock'] ?? 0);

                    // Si el talle coincide, descontar stock
                    if ($talle === $talleComprado) {
                        $nuevoStock = max(0, $stockVariante - $cantidad);
                        $stockDescontado += ($stockVariante - $nuevoStock);

                        $variante['stock'] = $nuevoStock;
                        logNotificacion(
                            "Stock actualizado - Producto: {$productoId}, " .
                            "Talle: {$talle}, Stock anterior: {$stockVariante}, " .
                            "Stock nuevo: {$nuevoStock}"
                        );
                    }

                    $variantesActualizadas[] = $variante;
                }

                // Calcular nuevo stock total
                $nuevoStockTotal = max(0, $stockActual - $stockDescontado);

                // Determinar nuevo estado según el stock
                $nuevoEstado = $producto['estado'] ?? 'Activo';
                if ($nuevoStockTotal === 0) {
                    $nuevoEstado = 'Sin stock';
                } elseif ($nuevoStockTotal <= 5) {
                    $nuevoEstado = 'Bajo stock';
                }

                // Actualizar publicable
                $publicable = in_array($nuevoEstado, ['Activo', 'Bajo stock']) && ($nuevoStockTotal > 0);

                // Actualizar producto en la base de datos
                $resultado = $productosCollection->updateOne(
                    ['_id' => new MongoDB\BSON\ObjectId($productoId)],
                    [
                        '$set' => [
                            'variantes' => $variantesActualizadas,
                            'stock' => $nuevoStockTotal,
                            'estado' => $nuevoEstado,
                            'publicable' => $publicable
                        ]
                    ]
                );

                if ($resultado->getModifiedCount() > 0) {
                    logNotificacion(
                        "Stock descontado exitosamente - Producto: {$productoId}, " .
                        "Pedido: {$pedido['numero_pedido']}, " .
                        "Stock total anterior: {$stockActual}, " .
                        "Stock total nuevo: {$nuevoStockTotal}, " .
                        "Estado: {$nuevoEstado}"
                    );
                } else {
                    logNotificacion(
                        "No se modificó el stock del producto: {$productoId} " .
                        "(puede que ya estuviera actualizado)"
                    );
                }

            } catch (Exception $e) {
                logNotificacion(
                    "Error procesando producto {$productoId}: " .
                    $e->getMessage()
                );
                continue;
            }
        }

        return true;

    } catch (Exception $e) {
        logNotificacion("Error general descontando stock: " . $e->getMessage());
        return false;
    }
}

// ========================================
// PROCESAMIENTO DEL WEBHOOK
// ========================================

try {
    // Validar firma del webhook (seguridad)
    if (!validarFirmaWebhook()) {
        // Si la firma es inválida, rechazar la notificación
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Firma inválida'
        ]);
        logNotificacion("❌ Notificación rechazada por firma inválida");
        exit;
    }

    // Obtener datos del webhook
    $webhookData = obtenerDatosWebhook();
    $data = $webhookData['data'];
    $params = $webhookData['params'];

    // Mercado Pago usa diferentes formatos de webhook:
    // Formato antiguo: ?topic=payment&id=123
    // Formato nuevo v1: ?type=payment&data_id=123 (GET) + POST con data.id
    $topic = $params['topic'] ?? ($params['type'] ?? ($data['type'] ?? null));

    // Extraer ID del pago de múltiples posibles ubicaciones
    $id = $params['id'] ??
          $params['data_id'] ??
          ($params['data.id'] ??
          ($data['data']['id'] ??
          ($data['id'] ?? null)));

    logNotificacion("Procesando notificación - Topic: {$topic}, ID: {$id}");

    // Responder inmediatamente a Mercado Pago para evitar reintentos
    http_response_code(200);
    echo json_encode(['success' => true]);

    // Procesar según el tipo de notificación
    switch ($topic) {
        case 'payment':
        case 'topic_payment_wh':
            // Notificación de pago
            if ($id) {
                // Consultar el pago en Mercado Pago para obtener todos los datos
                $paymentData = consultarPago($id);

                if ($paymentData) {
                    // Actualizar el estado del pedido
                    actualizarEstadoPedido($paymentData);
                }
            }
            break;

        case 'merchant_order':
        case 'topic_merchant_order_wh':
            // Notificación de orden de comercio
            // Algunos medios de pago (Rapipago, PagoFácil, etc.) notifican primero merchant_order
            logNotificacion("📦 Merchant order recibida: {$id}");

            if ($id) {
                $merchantOrderData = consultarMerchantOrder($id);

                if ($merchantOrderData) {
                    // Procesar la orden y sus pagos asociados
                    procesarMerchantOrder($merchantOrderData);
                }
            }
            break;

        default:
            logNotificacion("⚠️ Tipo de notificación desconocida: {$topic}");
            logNotificacion("   ID recibido: {$id}");
            logNotificacion("   Tipos soportados: payment, topic_payment_wh, merchant_order, topic_merchant_order_wh");
            break;
    }

} catch (Exception $e) {
    logNotificacion("Error en webhook: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}