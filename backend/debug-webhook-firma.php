<?php
/**
 * Script de Diagnóstico de Firma de Webhook
 *
 * Este script captura y muestra TODOS los datos que envía Mercado Pago
 * para ayudar a depurar problemas de validación de firma.
 */

// Habilitar logs de errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Archivo de log
$logFile = __DIR__ . '/logs/webhook-debug.log';

// Función para escribir logs
function debugLog($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] {$message}\n";

    // Crear directorio si no existe
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    file_put_contents($logFile, $logMessage, FILE_APPEND);
    echo $logMessage;
}

debugLog("========================================");
debugLog("NUEVA NOTIFICACIÓN DE WEBHOOK");
debugLog("========================================");

// 1. Capturar método HTTP
debugLog("Método HTTP: " . $_SERVER['REQUEST_METHOD']);

// 2. Capturar URL completa
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$fullUrl = $protocol . "://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
debugLog("URL Completa: " . $fullUrl);

// 3. Capturar TODOS los headers
debugLog("\n--- HEADERS ---");
$headers = getallheaders();
if ($headers) {
    foreach ($headers as $name => $value) {
        debugLog("{$name}: {$value}");
    }
} else {
    debugLog("No se pudieron obtener headers con getallheaders()");

    // Intentar obtener headers manualmente
    debugLog("\n--- HEADERS (manual) ---");
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            debugLog("{$headerName}: {$value}");
        }
    }
}

// 4. Capturar parámetros GET
debugLog("\n--- PARÁMETROS GET ---");
if (!empty($_GET)) {
    foreach ($_GET as $key => $value) {
        debugLog("{$key} = {$value}");
    }
} else {
    debugLog("No hay parámetros GET");
}

// 5. Capturar body (POST)
debugLog("\n--- BODY (POST) ---");
$rawBody = file_get_contents('php://input');
if ($rawBody) {
    debugLog("Raw Body: " . $rawBody);

    $jsonData = json_decode($rawBody, true);
    if ($jsonData) {
        debugLog("Body parseado: " . print_r($jsonData, true));
    } else {
        debugLog("Body NO es JSON válido");
    }
} else {
    debugLog("Body vacío");
}

// 6. Intentar validar firma con diferentes templates
debugLog("\n--- INTENTOS DE VALIDACIÓN DE FIRMA ---");

// Cargar configuración si existe
if (file_exists(__DIR__ . '/mp-config.php')) {
    require_once __DIR__ . '/mp-config.php';
    debugLog("MP_WEBHOOK_SECRET configurado: " . (defined('MP_WEBHOOK_SECRET') ? 'SÍ' : 'NO'));

    if (defined('MP_WEBHOOK_SECRET') && MP_WEBHOOK_SECRET !== 'TU_CLAVE_SECRETA_AQUI') {
        $secret = MP_WEBHOOK_SECRET;
        debugLog("Secret Key (primeros 10 chars): " . substr($secret, 0, 10) . "...");

        // Extraer componentes de la firma
        $xSignature = $_SERVER['HTTP_X_SIGNATURE'] ?? null;
        $xRequestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? null;

        if ($xSignature && $xRequestId) {
            // Parsear x-signature
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

            debugLog("Timestamp (ts): {$ts}");
            debugLog("Hash recibido (v1): {$hash}");
            debugLog("X-Request-Id: {$xRequestId}");

            // Intentar diferentes IDs
            $possibleDataIds = [
                $_GET['data.id'] ?? null,
                $_GET['id'] ?? null,
                $_GET['data_id'] ?? null,
                $jsonData['data']['id'] ?? null,
                $jsonData['id'] ?? null
            ];

            debugLog("\nPosibles data.id encontrados:");
            foreach ($possibleDataIds as $idx => $dataId) {
                if ($dataId) {
                    debugLog("  [{$idx}] = {$dataId}");
                }
            }

            // Probar diferentes templates
            $templates = [
                // Template oficial MP
                "id:{dataId};request-id:{$xRequestId};ts:{$ts};",
                // Template con data_id
                "data_id:{dataId};request-id:{$xRequestId};ts:{$ts};",
                // Sin punto y coma final
                "id:{dataId};request-id:{$xRequestId};ts:{$ts}",
                // Con resource en lugar de id
                "resource:{dataId};request-id:{$xRequestId};ts:{$ts};",
            ];

            debugLog("\nProbando diferentes templates:");

            foreach ($possibleDataIds as $dataId) {
                if (!$dataId) continue;

                debugLog("\n--- Con data.id = {$dataId} ---");

                foreach ($templates as $templatePattern) {
                    $manifest = str_replace('{dataId}', $dataId, $templatePattern);
                    $calculatedHash = hash_hmac('sha256', $manifest, $secret);

                    $match = hash_equals($calculatedHash, $hash) ? '✅ MATCH!' : '❌ No match';
                    debugLog("Template: {$manifest}");
                    debugLog("Hash calculado: {$calculatedHash} {$match}");
                }
            }
        } else {
            debugLog("No se encontraron headers x-signature o x-request-id");
        }
    }
}

debugLog("\n========================================");
debugLog("FIN DEL DIAGNÓSTICO");
debugLog("========================================\n\n");

// Responder 200 OK para que MP no reintente
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Diagnóstico completado. Ver logs/webhook-debug.log'
]);
