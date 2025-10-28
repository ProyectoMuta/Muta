<?php
/**
 * Controlador de Pagos con Mercado Pago
 *
 * Este archivo maneja toda la lógica de creación de preferencias de pago
 * y la integración con la API de Mercado Pago.
 */

// Headers CORS para permitir peticiones desde el frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Manejo de peticiones OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Requerir archivos necesarios
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/mp-config.php';
require_once __DIR__ . '/config.php';

use MercadoPago\MercadoPagoConfig;
use MercadoPago\Client\Preference\PreferenceClient;
use MercadoPago\Exceptions\MPApiException;

/**
 * Clase principal del controlador de pagos
 */
class PagosController {
    private $preferenceClient;
    private $db;

    public function __construct($requireMongo = true) {
        try {
            // Verificar que las credenciales estén configuradas
            if (!verificarCredencialesMP()) {
                throw new Exception('Las credenciales de Mercado Pago no están configuradas. Por favor, edita backend/mp-config.php');
            }

            // Configurar Mercado Pago SDK
            MercadoPagoConfig::setAccessToken(MP_ACCESS_TOKEN);
            MercadoPagoConfig::setRuntimeEnviroment(MercadoPagoConfig::LOCAL);

            // Crear cliente de preferencias
            $this->preferenceClient = new PreferenceClient();

            // Conexión a MongoDB (solo si es requerida)
            if ($requireMongo) {
                global $mongoClient;
                if (!isset($mongoClient)) {
                    throw new Exception('No hay conexión a MongoDB');
                }
                $this->db = $mongoClient->mutaDB;
            }

        } catch (Exception $e) {
            $this->responderError($e->getMessage(), 500);
        }
    }

    /**
     * Crea una preferencia de pago en Mercado Pago
     */
    public function crearPreferencia() {
        try {
            // Obtener datos del POST
            $rawInput = file_get_contents('php://input');
            error_log("MP DEBUG - Raw input: " . $rawInput);

            $input = json_decode($rawInput, true);
            error_log("MP DEBUG - Parsed input: " . print_r($input, true));
            error_log("MP DEBUG - Items isset: " . (isset($input['items']) ? 'YES' : 'NO'));
            error_log("MP DEBUG - Items empty: " . (empty($input['items']) ? 'YES' : 'NO'));

            // Validar datos requeridos
            if (!isset($input['items']) || empty($input['items'])) {
                throw new Exception('No se enviaron items para el pago');
            }

            if (!isset($input['payer'])) {
                throw new Exception('No se enviaron datos del comprador');
            }

            // Preparar items para Mercado Pago
            $items = [];
            foreach ($input['items'] as $item) {
                $unitPrice = floatval($item['precio_unitario']);

                // Validar que el precio sea mayor a 0
                if ($unitPrice <= 0) {
                    throw new Exception('El precio del producto debe ser mayor a 0. Producto: ' . ($item['nombre'] ?? 'sin nombre'));
                }

                $items[] = [
                    'id' => $item['id'] ?? uniqid(),
                    'title' => $item['nombre'],
                    'description' => $this->formatearDescripcion($item),
                    'quantity' => intval($item['cantidad']),
                    'unit_price' => $unitPrice,
                    'currency_id' => MP_CURRENCY
                ];
            }

            // Preparar datos del comprador
            $payerEmail = $input['payer']['email'] ?? '';

            // Validar que el email no esté vacío y sea válido
            if (empty($payerEmail) || !filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
                throw new Exception('El email del comprador es requerido y debe ser válido');
            }

            $payer = [
                'name' => $input['payer']['nombre'] ?? '',
                'email' => $payerEmail,
                'phone' => [
                    'number' => $input['payer']['telefono'] ?? ''
                ]
            ];

            // Preparar datos de envío si existen
            $shipments = null;
            if (isset($input['shipment']) && !empty($input['shipment'])) {
                $shipments = [
                    'cost' => floatval($input['shipment']['costo'] ?? 0),
                    'receiver_address' => [
                        'street_name' => $input['shipment']['direccion']['calle'] ?? '',
                        'street_number' => $input['shipment']['direccion']['numero'] ?? '',
                        'zip_code' => $input['shipment']['direccion']['codigo_postal'] ?? '',
                        'city_name' => $input['shipment']['direccion']['ciudad'] ?? '',
                        'state_name' => $input['shipment']['direccion']['provincia'] ?? '',
                        'country_name' => $input['shipment']['direccion']['pais'] ?? 'Argentina'
                    ]
                ];
            }

            // Preparar metadata (información adicional del pedido)
            $metadata = [
                'pedido_id' => $input['pedido_id'] ?? null,
                'usuario_id' => $input['usuario_id'] ?? null,
                'numero_pedido' => $input['numero_pedido'] ?? null
            ];

            // Crear preferencia
            $preferenceData = [
                'items' => $items,
                'payer' => $payer,
                'back_urls' => [
                    'success' => MP_SUCCESS_URL,
                    'failure' => MP_FAILURE_URL,
                    'pending' => MP_PENDING_URL
                ],
                // Nota: auto_return se quita porque causa error 400 en algunas versiones del SDK
                // El usuario deberá hacer click en "Volver al sitio" después de pagar
                'statement_descriptor' => MP_STATEMENT_DESCRIPTOR,
                'external_reference' => $input['numero_pedido'] ?? uniqid('MUTA-'),
                'notification_url' => MP_NOTIFICATION_URL,
                'metadata' => $metadata
            ];

            // Agregar envío si existe
            if ($shipments !== null) {
                $preferenceData['shipments'] = $shipments;
            }

            error_log("MP DEBUG - Preference data to send: " . print_r($preferenceData, true));

            // Crear la preferencia en Mercado Pago
            try {
                $preference = $this->preferenceClient->create($preferenceData);
                error_log("MP DEBUG - Preference created successfully: " . $preference->id);
            } catch (MPApiException $mpError) {
                error_log("MP DEBUG - MPApiException occurred");
                error_log("MP DEBUG - Error message: " . $mpError->getMessage());
                error_log("MP DEBUG - Status code: " . $mpError->getStatusCode());
                error_log("MP DEBUG - API Response: " . print_r($mpError->getApiResponse(), true));
                throw $mpError;
            }

            // Guardar información de la preferencia en la base de datos
            if (isset($input['pedido_id']) && !empty($input['pedido_id'])) {
                $this->actualizarPedidoConPreferencia(
                    $input['pedido_id'],
                    $preference->id,
                    $preference->init_point,
                    $preference->sandbox_init_point
                );
            }

            // Responder con la preferencia creada
            $this->responderExito([
                'preferencia_id' => $preference->id,
                'init_point' => MP_SANDBOX_MODE ? $preference->sandbox_init_point : $preference->init_point,
                'sandbox_init_point' => $preference->sandbox_init_point,
                'modo_sandbox' => MP_SANDBOX_MODE
            ]);

        } catch (MPApiException $e) {
            // Error específico de Mercado Pago
            $this->responderError(
                'Error de Mercado Pago: ' . $e->getMessage(),
                $e->getStatusCode(),
                [
                    'api_error' => $e->getApiResponse(),
                    'status_code' => $e->getStatusCode()
                ]
            );
        } catch (Exception $e) {
            $this->responderError($e->getMessage(), 500);
        }
    }

    /**
     * Consulta el estado de un pago
     */
    public function consultarPago() {
        try {
            $payment_id = $_GET['payment_id'] ?? null;

            if (!$payment_id) {
                throw new Exception('ID de pago no proporcionado');
            }

            // Usar el SDK para consultar el pago
            // Nota: Esto requiere la clase Payment del SDK
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/payments/{$payment_id}");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . MP_ACCESS_TOKEN
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                throw new Exception('Error al consultar el pago');
            }

            $paymentData = json_decode($response, true);

            $this->responderExito([
                'status' => $paymentData['status'],
                'status_detail' => $paymentData['status_detail'],
                'transaction_amount' => $paymentData['transaction_amount'],
                'payment_method_id' => $paymentData['payment_method_id']
            ]);

        } catch (Exception $e) {
            $this->responderError($e->getMessage(), 500);
        }
    }

    /**
     * Actualiza el pedido en MongoDB con la información de la preferencia
     */
    private function actualizarPedidoConPreferencia($pedidoId, $preferenciaId, $initPoint, $sandboxInitPoint) {
        try {
            $pedidosCollection = $this->db->pedidos;

            $resultado = $pedidosCollection->updateOne(
                ['_id' => new MongoDB\BSON\ObjectId($pedidoId)],
                [
                    '$set' => [
                        'mercadopago' => [
                            'preferencia_id' => $preferenciaId,
                            'init_point' => $initPoint,
                            'sandbox_init_point' => $sandboxInitPoint,
                            'creado_en' => new MongoDB\BSON\UTCDateTime()
                        ],
                        'actualizado_en' => new MongoDB\BSON\UTCDateTime()
                    ]
                ]
            );

            return $resultado->getModifiedCount() > 0;

        } catch (Exception $e) {
            error_log("Error al actualizar pedido con preferencia: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Formatea la descripción de un producto para Mercado Pago
     */
    private function formatearDescripcion($item) {
        $descripcion = $item['nombre'];

        if (isset($item['talle']) && !empty($item['talle'])) {
            $descripcion .= " - Talle: " . $item['talle'];
        }

        if (isset($item['color']) && !empty($item['color'])) {
            $descripcion .= " - Color: " . $item['color'];
        }

        return $descripcion;
    }

    /**
     * Responde con un JSON de éxito
     */
    private function responderExito($data, $mensaje = 'OK') {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'mensaje' => $mensaje,
            'data' => $data
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    /**
     * Responde con un JSON de error
     */
    private function responderError($mensaje, $codigo = 400, $detalles = null) {
        http_response_code($codigo);
        $response = [
            'success' => false,
            'error' => $mensaje
        ];

        if ($detalles !== null) {
            $response['detalles'] = $detalles;
        }

        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// ========================================
// MANEJO DE PETICIONES
// ========================================

try {
    $action = $_GET['action'] ?? '';

    switch ($action) {
        case 'test_config':
            // Endpoint para verificar que la configuración está correcta (NO requiere MongoDB)
            if (verificarCredencialesMP()) {
                echo json_encode([
                    'success' => true,
                    'mensaje' => 'Configuración de Mercado Pago correcta',
                    'data' => [
                        'sandbox_mode' => MP_SANDBOX_MODE,
                        'public_key' => MP_PUBLIC_KEY,
                        'access_token_configurado' => !empty(MP_ACCESS_TOKEN)
                    ]
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => false,
                    'error' => 'Credenciales de Mercado Pago no configuradas'
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'crear_preferencia':
            $controller = new PagosController(true); // Requiere MongoDB
            $controller->crearPreferencia();
            break;

        case 'consultar_pago':
            $controller = new PagosController(false); // NO requiere MongoDB
            $controller->consultarPago();
            break;

        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Acción no válida. Usa: crear_preferencia, consultar_pago, test_config'
            ], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error del servidor: ' . $e->getMessage()
    ]);
}
