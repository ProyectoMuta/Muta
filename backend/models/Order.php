<?php

namespace Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Order
{
    public ?ObjectId $_id = null;
    public string $usuario_id;
    public string $numero_pedido;
    public ?UTCDateTime $fecha_compra = null;
    public array $productos = [];
    public ?array $direccion_envio = null;
    public float $subtotal = 0.0;
    public float $costo_envio = 0.0;
    public float $descuento = 0.0;
    public float $total = 0.0;
    public string $estado = 'en_espera';
    public string $metodo_pago;
    public string $estado_pago = 'pendiente';
    public ?string $numero_tracking = null;
    public ?UTCDateTime $fecha_pago = null;
    public ?UTCDateTime $fecha_envio = null;
    public ?UTCDateTime $fecha_entrega = null;
    public array $historial = [];
    public ?string $notas_cliente = null;
    public ?string $notas_admin = null;
    public ?array $mercadopago = null;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                if ($key === '_id' && is_string($value)) {
                    $this->_id = new ObjectId($value);
                } elseif (in_array($key, ['fecha_compra', 'fecha_pago', 'fecha_envio', 'fecha_entrega'])) {
                    if ($value && !($value instanceof UTCDateTime)) {
                        $this->{$key} = new UTCDateTime();
                    } else {
                        $this->{$key} = $value;
                    }
                } else {
                    $this->{$key} = $value;
                }
            }
        }

        if (!$this->fecha_compra) {
            $this->fecha_compra = new UTCDateTime();
        }

        if (!$this->numero_pedido) {
            $this->numero_pedido = $this->generateOrderNumber();
        }
    }

    public function toArray(): array
    {
        $data = [];
        foreach (get_object_vars($this) as $key => $value) {
            if ($key === '_id' && $value !== null) {
                $data[$key] = $value;
            } elseif ($key !== '_id') {
                $data[$key] = $value;
            }
        }
        return $data;
    }

    public function toJson(): array
    {
        $data = $this->toArray();
        if (isset($data['_id']) && $data['_id'] instanceof ObjectId) {
            $data['_id'] = (string) $data['_id'];
        }

        $dateFields = ['fecha_compra', 'fecha_pago', 'fecha_envio', 'fecha_entrega'];
        foreach ($dateFields as $field) {
            if (isset($data[$field]) && $data[$field] instanceof UTCDateTime) {
                $data[$field] = $data[$field]->toDateTime()->format('Y-m-d H:i:s');
            }
        }

        return $data;
    }

    public function calculateTotal(): void
    {
        $this->total = $this->subtotal + $this->costo_envio - $this->descuento;
    }

    public function addHistoryEntry(string $estado, string $nota = ''): void
    {
        $this->historial[] = [
            'fecha' => new UTCDateTime(),
            'estado' => $estado,
            'nota' => $nota
        ];
    }

    private function generateOrderNumber(): string
    {
        $year = date('Y');
        $random = str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
        return "MUTA-{$year}-{$random}";
    }

    public function getEstadosPosibles(): array
    {
        return ['en_espera', 'pagado', 'enviado', 'recibido', 'cancelado'];
    }

    public function getEstadosPagoPosibles(): array
    {
        return ['pendiente', 'aprobado', 'rechazado', 'reembolsado'];
    }
}
