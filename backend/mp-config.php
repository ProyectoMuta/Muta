<?php
/**
 * Configuración de Mercado Pago
 *
 * IMPORTANTE: Este archivo contiene las credenciales de Mercado Pago.
 * NO lo compartas públicamente ni lo subas a repositorios públicos.
 *
 * Para obtener tus credenciales de prueba:
 * 1. Ingresa a https://www.mercadopago.com.ar/developers/panel
 * 2. Ve a "Tus integraciones" > "Credenciales"
 * 3. Selecciona "Credenciales de prueba"
 * 4. Copia el Access Token y Public Key
 */

// ========================================
// CREDENCIALES DE MERCADO PAGO
// ========================================

// Credenciales de PRUEBA (Sandbox)
// Reemplaza estos valores con tus propias credenciales de prueba
define('MP_ACCESS_TOKEN', 'APP_USR-7815982440521226-103008-44564fb0ea35ee123719338e1ba3c0af-2942643227');
define('MP_PUBLIC_KEY', 'APP_USR-a14cfd8e-ed45-44c1-8700-03d9e5468e8b');

// Clave secreta del Webhook (Secret Key)
// La obtienes en el panel de MP cuando configuras el webhook
// IMPORTANTE: Esta clave sirve para validar que las notificaciones realmente vienen de Mercado Pago
define('MP_WEBHOOK_SECRET', '347dc71a974aae10142fc456e45e6e762be2f8ad917272b1a1962f533386d5fc');

// Cuando vayas a producción, cambia estas credenciales por las de producción
// define('MP_ACCESS_TOKEN', 'APP-TU_ACCESS_TOKEN_PRODUCCION');
// define('MP_PUBLIC_KEY', 'APP-TU_PUBLIC_KEY_PRODUCCION');
// define('MP_WEBHOOK_SECRET', 'TU_CLAVE_SECRETA_PRODUCCION');
// ========================================
// CONFIGURACIÓN DEL ENTORNO
// ========================================

// true = Modo de prueba (sandbox), false = Modo producción
define('MP_SANDBOX_MODE', true);

// ========================================
// URLs DE TU APLICACIÓN
// ========================================

// URL base de tu aplicación (ajusta según tu entorno)
// En desarrollo local podría ser: http://localhost/Muta
// En producción: https://tudominio.com
define('BASE_URL', 'https://bethany-unpouched-explicitly.ngrok-free.dev/Muta');

// URLs de redirección después del pago
define('MP_SUCCESS_URL', BASE_URL . '/payment-success.html');
define('MP_FAILURE_URL', BASE_URL . '/payment-failure.html');
define('MP_PENDING_URL', BASE_URL . '/payment-pending.html');

// URL para recibir notificaciones de Mercado Pago (webhooks)
define('MP_NOTIFICATION_URL', BASE_URL . '/backend/mp-webhook.php');

// ========================================
// CONFIGURACIÓN ADICIONAL
// ========================================

// Título que aparecerá en Mercado Pago
define('MP_STATEMENT_DESCRIPTOR', 'MUTA - Tienda de Ropa');

// País (AR = Argentina)
define('MP_COUNTRY', 'AR');

// Moneda (ARS = Pesos Argentinos)
define('MP_CURRENCY', 'ARS');

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Verifica si las credenciales están configuradas
 */
function verificarCredencialesMP() {
    if (MP_ACCESS_TOKEN === 'TEST-TU_ACCESS_TOKEN_AQUI' ||
        MP_PUBLIC_KEY === 'TEST-TU_PUBLIC_KEY_AQUI') {
        return false;
    }
    return true;
}

/**
 * Retorna las credenciales en formato array
 */
function getCredencialesMP() {
    return [
        'access_token' => MP_ACCESS_TOKEN,
        'public_key' => MP_PUBLIC_KEY,
        'sandbox' => MP_SANDBOX_MODE
    ];
}
