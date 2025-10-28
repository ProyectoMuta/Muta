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
require_once 'mp-config.php';
require_once 'config.php';

// Log de las notificaciones recibidas (útil para debugging)
$logFile = __DIR__ . '/../logs/mp-notifications.log';

// Crear carpeta de logs si no existe
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0777, true);
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
 * Consulta el estado de un pago en Mercado Pago
 */
function consultarPago($paymentId) {
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/payments/{$paymentId}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        logNotificacion("Error al consultar pago {$paymentId}: HTTP {$httpCode}");
        return null;
    }

    return json_decode($response, true);
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

        // Enviar email de confirmación si el pago fue aprobado
        if ($estadoPago === 'aprobado') {
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

// ========================================
// PROCESAMIENTO DEL WEBHOOK
// ========================================

try {
    // Obtener datos del webhook
    $webhookData = obtenerDatosWebhook();
    $data = $webhookData['data'];
    $params = $webhookData['params'];

    // Mercado Pago envía el tipo de notificación en el parámetro 'topic'
    $topic = $params['topic'] ?? ($data['type'] ?? null);
    $id = $params['id'] ?? ($data['data']['id'] ?? null);

    logNotificacion("Procesando notificación - Topic: {$topic}, ID: {$id}");

    // Responder inmediatamente a Mercado Pago para evitar reintentos
    http_response_code(200);
    echo json_encode(['success' => true]);

    // Procesar según el tipo de notificación
    switch ($topic) {
        case 'payment':
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
            // Notificación de orden de comercio
            logNotificacion("Merchant order recibida: {$id}");
            // Puedes procesar órdenes de comercio aquí si lo necesitas
            break;

        default:
            logNotificacion("Tipo de notificación desconocida: {$topic}");
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
