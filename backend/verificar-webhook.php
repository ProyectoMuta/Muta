<?php
/**
 * Script de Verificación del Webhook de Mercado Pago
 *
 * Este script verifica que tu webhook esté configurado correctamente
 * y sea accesible públicamente desde Internet.
 *
 * Ejecuta este script ANTES de configurar el webhook en Mercado Pago.
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "═══════════════════════════════════════════════════════\n";
echo "  VERIFICACIÓN DEL WEBHOOK DE MERCADO PAGO\n";
echo "═══════════════════════════════════════════════════════\n\n";

// Cargar configuración
require_once __DIR__ . '/mp-config.php';

// ========================================
// 1. VERIFICAR CONFIGURACIÓN
// ========================================

echo "📋 PASO 1: Verificando configuración...\n";
echo "───────────────────────────────────────────────────────\n";

if (!defined('MP_NOTIFICATION_URL')) {
    echo "❌ ERROR: MP_NOTIFICATION_URL no está definida\n";
    echo "   Verifica tu archivo backend/mp-config.php\n\n";
    exit(1);
}

$webhookUrl = MP_NOTIFICATION_URL;
echo "✅ URL del Webhook configurada:\n";
echo "   $webhookUrl\n\n";

// ========================================
// 2. VERIFICAR CREDENCIALES
// ========================================

echo "📋 PASO 2: Verificando credenciales...\n";
echo "───────────────────────────────────────────────────────\n";

$accessToken = MP_ACCESS_TOKEN;
$publicKey = MP_PUBLIC_KEY;
$sandboxMode = MP_SANDBOX_MODE ? 'SÍ (Modo prueba)' : 'NO (Modo producción)';

if (strpos($accessToken, 'TEST-') !== false || strpos($accessToken, 'APP_USR-') !== false) {
    echo "✅ Access Token: configurado\n";
    echo "   Tipo: " . (strpos($accessToken, 'TEST-') !== false ? 'Prueba' : 'Producción') . "\n";
} else {
    echo "⚠️  Access Token: No parece válido\n";
}

if (strpos($publicKey, 'TEST-') !== false || strpos($publicKey, 'APP_USR-') !== false) {
    echo "✅ Public Key: configurado\n";
    echo "   Tipo: " . (strpos($publicKey, 'TEST-') !== false ? 'Prueba' : 'Producción') . "\n";
} else {
    echo "⚠️  Public Key: No parece válido\n";
}

echo "📍 Modo Sandbox: $sandboxMode\n\n";

// ========================================
// 3. VERIFICAR ARCHIVO DEL WEBHOOK
// ========================================

echo "📋 PASO 3: Verificando archivo del webhook...\n";
echo "───────────────────────────────────────────────────────\n";

$webhookFile = __DIR__ . '/mp-webhook.php';

if (file_exists($webhookFile)) {
    echo "✅ Archivo mp-webhook.php existe\n";
    echo "   Ruta: $webhookFile\n";

    if (is_readable($webhookFile)) {
        echo "✅ Archivo es legible\n";
    } else {
        echo "❌ Archivo NO es legible (verifica permisos)\n";
    }
} else {
    echo "❌ ERROR: Archivo mp-webhook.php NO existe\n";
    echo "   Se esperaba en: $webhookFile\n\n";
    exit(1);
}

echo "\n";

// ========================================
// 4. VERIFICAR CARPETA DE LOGS
// ========================================

echo "📋 PASO 4: Verificando carpeta de logs...\n";
echo "───────────────────────────────────────────────────────\n";

$logsDir = __DIR__ . '/logs';

if (!file_exists($logsDir)) {
    echo "⚠️  Carpeta logs/ no existe. Intentando crearla...\n";
    if (mkdir($logsDir, 0777, true)) {
        echo "✅ Carpeta logs/ creada exitosamente\n";
    } else {
        echo "❌ No se pudo crear la carpeta logs/\n";
        echo "   Crea manualmente: mkdir -p backend/logs && chmod 777 backend/logs\n";
    }
} else {
    echo "✅ Carpeta logs/ existe\n";
}

if (is_writable($logsDir)) {
    echo "✅ Carpeta logs/ tiene permisos de escritura\n";
} else {
    echo "❌ Carpeta logs/ NO tiene permisos de escritura\n";
    echo "   Ejecuta: chmod 777 backend/logs\n";
}

echo "\n";

// ========================================
// 5. VERIFICAR ACCESIBILIDAD DESDE LOCALHOST
// ========================================

echo "📋 PASO 5: Probando accesibilidad local...\n";
echo "───────────────────────────────────────────────────────\n";

// Verificar si la URL es localhost o una IP local
$parsedUrl = parse_url($webhookUrl);
$host = $parsedUrl['host'] ?? '';

if (in_array($host, ['localhost', '127.0.0.1', '::1']) ||
    strpos($host, '192.168.') === 0 ||
    strpos($host, '10.') === 0) {

    echo "⚠️  ADVERTENCIA: Tu webhook usa una URL local ($host)\n";
    echo "   Mercado Pago NO podrá acceder a esta URL desde Internet.\n\n";
    echo "   Soluciones:\n";
    echo "   1. Usar ngrok: ngrok http 80\n";
    echo "   2. Usar un servidor con IP pública\n";
    echo "   3. Usar un dominio público con HTTPS\n\n";
} else {
    echo "✅ La URL no es localhost (es accesible externamente)\n";
    echo "   Host: $host\n\n";
}

// ========================================
// 6. VERIFICAR HTTPS
// ========================================

echo "📋 PASO 6: Verificando protocolo HTTPS...\n";
echo "───────────────────────────────────────────────────────\n";

$scheme = $parsedUrl['scheme'] ?? '';

if ($scheme === 'https') {
    echo "✅ Webhook usa HTTPS (requerido por Mercado Pago)\n\n";
} else {
    echo "❌ ERROR: Webhook NO usa HTTPS\n";
    echo "   URL actual: $webhookUrl\n";
    echo "   Mercado Pago REQUIERE HTTPS para webhooks.\n\n";
    echo "   Soluciones:\n";
    echo "   1. Usar ngrok con HTTPS: ngrok http 80 (ngrok provee HTTPS automáticamente)\n";
    echo "   2. Configurar un certificado SSL en tu servidor\n";
    echo "   3. Usar un servicio como Cloudflare para HTTPS\n\n";
}

// ========================================
// 7. PROBAR ACCESO AL WEBHOOK
// ========================================

echo "📋 PASO 7: Probando acceso al webhook...\n";
echo "───────────────────────────────────────────────────────\n";

echo "Intentando hacer una petición al webhook...\n";

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Solo para pruebas

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($httpCode === 200) {
    echo "✅ Webhook accesible (HTTP 200)\n";
    echo "   Respuesta: " . substr($response, 0, 100) . "...\n\n";
} else if ($httpCode > 0) {
    echo "⚠️  Webhook respondió con código HTTP $httpCode\n";
    if ($error) {
        echo "   Error: $error\n";
    }
    echo "\n";
} else {
    echo "❌ ERROR: No se pudo acceder al webhook\n";
    if ($error) {
        echo "   Error: $error\n";
    }
    echo "\n";
    echo "   Posibles causas:\n";
    echo "   1. La URL no es accesible públicamente\n";
    echo "   2. El servidor está apagado\n";
    echo "   3. Hay un firewall bloqueando el acceso\n";
    echo "   4. La URL es incorrecta\n\n";
}

// ========================================
// RESUMEN FINAL
// ========================================

echo "═══════════════════════════════════════════════════════\n";
echo "  RESUMEN\n";
echo "═══════════════════════════════════════════════════════\n\n";

echo "📍 URL del Webhook:\n";
echo "   $webhookUrl\n\n";

echo "📋 Para configurar en Mercado Pago:\n";
echo "   1. Ve a: https://www.mercadopago.com.ar/developers/panel\n";
echo "   2. Selecciona tu aplicación\n";
echo "   3. Ve a 'Webhooks' o 'Notificaciones'\n";
echo "   4. Agrega la URL de arriba\n";
echo "   5. Selecciona eventos: 'payment'\n";
echo "   6. Guarda la configuración\n\n";

echo "🧪 Para probar:\n";
echo "   1. Realiza un pago de prueba con la tarjeta:\n";
echo "      Número: 5031 7557 3453 0604\n";
echo "      Nombre: APRO\n";
echo "      CVV: 123\n";
echo "   2. Verifica el log: tail -f backend/logs/mp-notifications.log\n\n";

echo "═══════════════════════════════════════════════════════\n\n";
