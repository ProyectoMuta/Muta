<?php
/**
 * Script de prueba para el Webhook de Mercado Pago
 *
 * Este script simula una notificación de Mercado Pago para probar
 * que el webhook funciona correctamente y actualiza el estado del pedido.
 *
 * IMPORTANTE: Este script es solo para pruebas en desarrollo.
 * NO debe estar accesible en producción.
 */

// ========================================
// CONFIGURACIÓN
// ========================================

// URL del webhook (ajusta según tu entorno)
$webhookUrl = 'https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php';

// ID de pago de prueba (este payment_id debe existir en Mercado Pago)
// Para pruebas, puedes usar el ID que te devuelve Mercado Pago después de hacer un pago de prueba
$paymentId = $_GET['payment_id'] ?? '1234567890';

echo "========================================\n";
echo "TEST WEBHOOK DE MERCADO PAGO\n";
echo "========================================\n\n";

echo "📍 URL del Webhook: {$webhookUrl}\n";
echo "💳 Payment ID: {$paymentId}\n\n";

// ========================================
// SIMULAR NOTIFICACIÓN DE MERCADO PAGO
// ========================================

echo "📤 Enviando notificación simulada al webhook...\n\n";

// Mercado Pago envía los datos en el query string
$url = $webhookUrl . '?topic=payment&id=' . $paymentId;

// Realizar petición al webhook
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'User-Agent: MercadoPago-Test-Client'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "========================================\n";
echo "RESPUESTA DEL WEBHOOK\n";
echo "========================================\n\n";

echo "HTTP Status Code: {$httpCode}\n";
echo "Respuesta: {$response}\n\n";

if ($httpCode === 200) {
    echo "✅ El webhook respondió correctamente\n\n";

    echo "📋 Pasos siguientes:\n";
    echo "1. Verifica el archivo de log: backend/logs/mp-notifications.log\n";
    echo "2. Revisa si el pedido se actualizó en MongoDB\n";
    echo "3. Verifica si el stock se descontó correctamente\n\n";
} else {
    echo "❌ Error: El webhook no respondió correctamente\n\n";

    echo "🔧 Posibles causas:\n";
    echo "1. La URL del webhook no es accesible\n";
    echo "2. Hay un error en el código del webhook\n";
    echo "3. El servidor no tiene permisos para escribir en logs/\n\n";
}

echo "========================================\n";
echo "CÓMO USAR ESTE SCRIPT\n";
echo "========================================\n\n";

echo "1. Realiza un pago de prueba en tu aplicación\n";
echo "2. Copia el Payment ID que devuelve Mercado Pago\n";
echo "3. Ejecuta este script:\n";
echo "   php backend/test-webhook.php\n";
echo "   O desde el navegador:\n";
echo "   {$_SERVER['HTTP_HOST']}/backend/test-webhook.php?payment_id=PAYMENT_ID_AQUI\n\n";

echo "========================================\n";
echo "VERIFICAR EN MERCADO PAGO\n";
echo "========================================\n\n";

echo "Para ver los webhooks reales enviados por Mercado Pago:\n";
echo "1. Ve a https://www.mercadopago.com.ar/developers/panel\n";
echo "2. Selecciona tu aplicación\n";
echo "3. Ve a 'Notificaciones' o 'Webhooks'\n";
echo "4. Verifica que la URL esté configurada correctamente:\n";
echo "   URL: {$webhookUrl}\n";
echo "   Eventos: payments\n\n";

echo "========================================\n";
