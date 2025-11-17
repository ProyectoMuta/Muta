<?php
/**
 * Script de diagnóstico para la API de Mercado Pago
 *
 * Este script ayuda a diagnosticar problemas con:
 * - Credenciales de acceso
 * - Conectividad con la API
 * - Consulta de pagos específicos
 */

require_once 'mp-config.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Verifica las credenciales de Mercado Pago
 */
function verificarCredenciales() {
    $resultado = [
        'configurado' => false,
        'access_token' => null,
        'tipo_token' => null,
        'es_test' => null
    ];

    if (defined('MP_ACCESS_TOKEN') && MP_ACCESS_TOKEN !== 'TEST-TU_ACCESS_TOKEN_AQUI') {
        $resultado['configurado'] = true;
        $token = MP_ACCESS_TOKEN;

        // Ocultar parte del token por seguridad
        $tokenLength = strlen($token);
        $resultado['access_token'] = substr($token, 0, 15) . '...' . substr($token, -10);

        // Determinar tipo de token
        if (strpos($token, 'APP_USR') === 0) {
            $resultado['tipo_token'] = 'Producción o Test';
            $resultado['es_test'] = (strpos($token, 'TEST-') !== false);
        } elseif (strpos($token, 'TEST-') === 0) {
            $resultado['tipo_token'] = 'Test/Sandbox';
            $resultado['es_test'] = true;
        }
    }

    return $resultado;
}

/**
 * Prueba la conectividad con la API de Mercado Pago
 */
function probarConexionAPI() {
    $ch = curl_init();

    // Endpoint para obtener información de la cuenta
    curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/users/me");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $resultado = [
        'conectado' => ($httpCode === 200),
        'http_code' => $httpCode,
        'error_curl' => $curlError ?: null
    ];

    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $resultado['usuario_id'] = $data['id'] ?? null;
        $resultado['email'] = $data['email'] ?? null;
        $resultado['pais'] = $data['site_id'] ?? null;
    } else {
        $resultado['respuesta'] = json_decode($response, true);
    }

    return $resultado;
}

/**
 * Consulta un pago específico
 */
function consultarPagoTest($paymentId) {
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

    $resultado = [
        'encontrado' => ($httpCode === 200),
        'http_code' => $httpCode,
        'error_curl' => $curlError ?: null
    ];

    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $resultado['payment_id'] = $data['id'] ?? null;
        $resultado['status'] = $data['status'] ?? null;
        $resultado['external_reference'] = $data['external_reference'] ?? null;
        $resultado['amount'] = $data['transaction_amount'] ?? null;
        $resultado['date_created'] = $data['date_created'] ?? null;
    } else {
        $respuesta = json_decode($response, true);
        $resultado['respuesta'] = $respuesta;
        $resultado['mensaje_error'] = $respuesta['message'] ?? 'Error desconocido';
    }

    return $resultado;
}

/**
 * Busca pagos recientes
 */
function buscarPagosRecientes() {
    $ch = curl_init();

    // Buscar pagos de los últimos 7 días
    $fechaDesde = date('Y-m-d\TH:i:s.000-00:00', strtotime('-7 days'));
    $fechaHasta = date('Y-m-d\TH:i:s.000-00:00');

    $url = "https://api.mercadopago.com/v1/payments/search?" . http_build_query([
        'range' => 'date_created',
        'begin_date' => $fechaDesde,
        'end_date' => $fechaHasta,
        'sort' => 'date_created',
        'criteria' => 'desc',
        'limit' => 10
    ]);

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $resultado = [
        'exitoso' => ($httpCode === 200),
        'http_code' => $httpCode,
        'error_curl' => $curlError ?: null
    ];

    if ($httpCode === 200) {
        $data = json_decode($response, true);
        $resultado['total'] = $data['paging']['total'] ?? 0;

        if (isset($data['results']) && is_array($data['results'])) {
            $resultado['pagos'] = array_map(function($pago) {
                return [
                    'id' => $pago['id'] ?? null,
                    'status' => $pago['status'] ?? null,
                    'external_reference' => $pago['external_reference'] ?? null,
                    'amount' => $pago['transaction_amount'] ?? null,
                    'date_created' => $pago['date_created'] ?? null
                ];
            }, $data['results']);
        }
    } else {
        $resultado['respuesta'] = json_decode($response, true);
    }

    return $resultado;
}

// ========================================
// EJECUTAR DIAGNÓSTICO
// ========================================

$diagnostico = [
    'fecha_hora' => date('Y-m-d H:i:s'),
    'credenciales' => verificarCredenciales(),
    'conexion_api' => null,
    'pagos_recientes' => null,
    'test_pago_especifico' => null
];

// Solo continuar si las credenciales están configuradas
if ($diagnostico['credenciales']['configurado']) {
    $diagnostico['conexion_api'] = probarConexionAPI();

    if ($diagnostico['conexion_api']['conectado']) {
        $diagnostico['pagos_recientes'] = buscarPagosRecientes();

        // Si hay un payment_id en la URL, consultarlo
        if (isset($_GET['payment_id'])) {
            $paymentId = $_GET['payment_id'];
            $diagnostico['test_pago_especifico'] = consultarPagoTest($paymentId);
        }
    }
}

// Generar recomendaciones
$diagnostico['recomendaciones'] = [];

if (!$diagnostico['credenciales']['configurado']) {
    $diagnostico['recomendaciones'][] = "⚠️ Configura tus credenciales de Mercado Pago en mp-config.php";
}

if ($diagnostico['conexion_api'] && !$diagnostico['conexion_api']['conectado']) {
    $diagnostico['recomendaciones'][] = "❌ No se pudo conectar a la API de Mercado Pago. Verifica tu access token.";
}

if ($diagnostico['pagos_recientes'] && $diagnostico['pagos_recientes']['total'] === 0) {
    $diagnostico['recomendaciones'][] = "ℹ️ No hay pagos recientes en los últimos 7 días. Esto es normal si no has procesado pagos recientemente.";
}

if ($diagnostico['test_pago_especifico'] && !$diagnostico['test_pago_especifico']['encontrado']) {
    $httpCode = $diagnostico['test_pago_especifico']['http_code'];
    if ($httpCode === 404) {
        $diagnostico['recomendaciones'][] = "⚠️ El pago especificado no existe o no pertenece a tu cuenta. Verifica:";
        $diagnostico['recomendaciones'][] = "   - Que el payment_id sea correcto";
        $diagnostico['recomendaciones'][] = "   - Que estés usando el access token de la cuenta correcta";
        $diagnostico['recomendaciones'][] = "   - Que el pago no haya sido eliminado o sea de prueba";
    } elseif ($httpCode === 401) {
        $diagnostico['recomendaciones'][] = "❌ Error de autenticación. Verifica tu access token en mp-config.php";
    }
}

// Imprimir resultado
echo json_encode($diagnostico, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
