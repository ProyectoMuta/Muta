<?php
require_once 'vendor/autoload.php';
require_once 'mp-config.php';

use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Preference\PreferenceClient;

echo "=== TEST CREAR PREFERENCIA ===\n\n";
echo "Access Token: " . substr(MP_ACCESS_TOKEN, 0, 30) . "...\n";
echo "Sandbox Mode: " . (MP_SANDBOX_MODE ? 'true' : 'false') . "\n\n";

// Configurar SDK
MercadoPagoConfig::setAccessToken(MP_ACCESS_TOKEN);

// Crear preferencia simple
$client = new PreferenceClient();

try {
    $preference = $client->create([
        'items' => [[
            'id' => 'TEST-001',
            'title' => 'Producto Test',
            'quantity' => 1,
            'unit_price' => 100
        ]],
        'external_reference' => 'TEST-' . time()
    ]);
    
    echo "✅ PREFERENCIA CREADA\n\n";
    echo "Preference ID: " . $preference->id . "\n";
    echo "Init Point: " . $preference->init_point . "\n";
    echo "Sandbox Init Point: " . $preference->sandbox_init_point . "\n\n";
    
    echo "👉 Usa este link para pagar:\n";
    echo MP_SANDBOX_MODE ? $preference->sandbox_init_point : $preference->init_point;
    echo "\n\n";
    
    echo "Después de pagar, el webhook recibirá el payment_id.\n";
    echo "Ese payment_id DEBE poder consultarse con este mismo Access Token.\n";
    
} catch (Exception $e) {
    echo "❌ ERROR al crear preferencia:\n";
    echo $e->getMessage() . "\n";
}
?>