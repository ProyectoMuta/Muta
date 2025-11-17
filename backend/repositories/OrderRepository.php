<?php

namespace Repositories;

use Config\MongoDB;
use Models\Order;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class OrderRepository
{
    private $collection;

    public function __construct()
    {
        $this->collection = MongoDB::getInstance()->pedidos;
    }

    // CREATE
    public function create(Order $order): ?string
    {
        try {
            $result = $this->collection->insertOne($order->toArray());
            return (string) $result->getInsertedId();
        } catch (\Exception $e) {
            error_log("Error creating order: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Find by ID
    public function findById(string $id): ?Order
    {
        try {
            $document = $this->collection->findOne(['_id' => new ObjectId($id)]);
            return $document ? new Order((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding order: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by order number
    public function findByOrderNumber(string $orderNumber): ?Order
    {
        try {
            $document = $this->collection->findOne(['numero_pedido' => $orderNumber]);
            return $document ? new Order((array) $document) : null;
        } catch (\Exception $e) {
            error_log("Error finding order by number: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find all with filters
    public function findAll(array $filters = [], int $limit = 20, int $skip = 0, array $sort = []): array
    {
        try {
            $query = $this->buildQuery($filters);
            $options = [
                'limit' => $limit,
                'skip' => $skip,
            ];

            if (!empty($sort)) {
                $options['sort'] = $sort;
            } else {
                $options['sort'] = ['fecha_compra' => -1];
            }

            $cursor = $this->collection->find($query, $options);
            $orders = [];
            foreach ($cursor as $document) {
                $orders[] = new Order((array) $document);
            }
            return $orders;
        } catch (\Exception $e) {
            error_log("Error finding orders: " . $e->getMessage());
            return [];
        }
    }

    // READ - Find by user
    public function findByUser(string $userId, int $limit = 20, int $skip = 0): array
    {
        try {
            $cursor = $this->collection->find(
                ['usuario_id' => $userId],
                [
                    'limit' => $limit,
                    'skip' => $skip,
                    'sort' => ['fecha_compra' => -1]
                ]
            );

            $orders = [];
            foreach ($cursor as $document) {
                $orders[] = new Order((array) $document);
            }
            return $orders;
        } catch (\Exception $e) {
            error_log("Error finding user orders: " . $e->getMessage());
            return [];
        }
    }

    // READ - Count
    public function count(array $filters = []): int
    {
        try {
            $query = $this->buildQuery($filters);
            return $this->collection->countDocuments($query);
        } catch (\Exception $e) {
            error_log("Error counting orders: " . $e->getMessage());
            return 0;
        }
    }

    // UPDATE
    public function update(string $id, Order $order): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $order->toArray()]
            );
            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating order: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Partial update
    public function updateFields(string $id, array $fields): bool
    {
        try {
            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                ['$set' => $fields]
            );
            return $result->getModifiedCount() > 0 || $result->getMatchedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating order fields: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Status
    public function updateStatus(string $id, string $estado, ?string $nota = null): bool
    {
        try {
            $update = ['estado' => $estado];

            $historyEntry = [
                'fecha' => new UTCDateTime(),
                'estado' => $estado,
                'nota' => $nota ?? ''
            ];

            // Update date fields based on status
            if ($estado === 'enviado' && !isset($update['fecha_envio'])) {
                $update['fecha_envio'] = new UTCDateTime();
            } elseif ($estado === 'recibido' && !isset($update['fecha_entrega'])) {
                $update['fecha_entrega'] = new UTCDateTime();
            }

            $result = $this->collection->updateOne(
                ['_id' => new ObjectId($id)],
                [
                    '$set' => $update,
                    '$push' => ['historial' => $historyEntry]
                ]
            );

            return $result->getModifiedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating order status: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Payment status
    public function updatePaymentStatus(string $id, string $estadoPago, ?array $mercadopagoData = null): bool
    {
        try {
            $update = ['estado_pago' => $estadoPago];

            if ($estadoPago === 'aprobado') {
                $update['fecha_pago'] = new UTCDateTime();
                $update['estado'] = 'pagado';
            }

            if ($mercadopagoData) {
                $update['mercadopago'] = $mercadopagoData;
            }

            return $this->updateFields($id, $update);
        } catch (\Exception $e) {
            error_log("Error updating payment status: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Tracking number
    public function updateTracking(string $id, string $trackingNumber): bool
    {
        try {
            return $this->updateFields($id, [
                'numero_tracking' => $trackingNumber,
                'estado' => 'enviado',
                'fecha_envio' => new UTCDateTime()
            ]);
        } catch (\Exception $e) {
            error_log("Error updating tracking: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE
    public function delete(string $id): bool
    {
        try {
            $result = $this->collection->deleteOne(['_id' => new ObjectId($id)]);
            return $result->getDeletedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error deleting order: " . $e->getMessage());
            throw $e;
        }
    }

    // Get statistics
    public function getStatistics(int $days = 30): array
    {
        try {
            $startDate = new UTCDateTime(strtotime("-{$days} days") * 1000);

            $pipeline = [
                [
                    '$match' => [
                        'fecha_compra' => ['$gte' => $startDate],
                        'estado_pago' => 'aprobado'
                    ]
                ],
                [
                    '$group' => [
                        '_id' => null,
                        'total_ventas' => ['$sum' => '$total'],
                        'total_pedidos' => ['$sum' => 1],
                        'promedio_venta' => ['$avg' => '$total']
                    ]
                ]
            ];

            $result = $this->collection->aggregate($pipeline)->toArray();

            if (empty($result)) {
                return [
                    'total_ventas' => 0,
                    'total_pedidos' => 0,
                    'promedio_venta' => 0
                ];
            }

            return [
                'total_ventas' => $result[0]['total_ventas'],
                'total_pedidos' => $result[0]['total_pedidos'],
                'promedio_venta' => $result[0]['promedio_venta']
            ];
        } catch (\Exception $e) {
            error_log("Error getting statistics: " . $e->getMessage());
            return [];
        }
    }

    // Get best selling products
    public function getBestSellingProducts(int $limit = 10): array
    {
        try {
            $pipeline = [
                ['$match' => ['estado_pago' => 'aprobado']],
                ['$unwind' => '$productos'],
                [
                    '$group' => [
                        '_id' => '$productos.producto_id',
                        'nombre' => ['$first' => '$productos.nombre'],
                        'cantidad_vendida' => ['$sum' => '$productos.cantidad'],
                        'total_recaudado' => ['$sum' => ['$multiply' => ['$productos.precio', '$productos.cantidad']]]
                    ]
                ],
                ['$sort' => ['cantidad_vendida' => -1]],
                ['$limit' => $limit]
            ];

            $result = $this->collection->aggregate($pipeline)->toArray();
            return array_map(function($item) {
                return [
                    'producto_id' => (string) $item['_id'],
                    'nombre' => $item['nombre'],
                    'cantidad_vendida' => $item['cantidad_vendida'],
                    'total_recaudado' => $item['total_recaudado']
                ];
            }, $result);
        } catch (\Exception $e) {
            error_log("Error getting best selling products: " . $e->getMessage());
            return [];
        }
    }

    // Get sales by payment method
    public function getSalesByPaymentMethod(): array
    {
        try {
            $pipeline = [
                ['$match' => ['estado_pago' => 'aprobado']],
                [
                    '$group' => [
                        '_id' => '$metodo_pago',
                        'cantidad' => ['$sum' => 1],
                        'total' => ['$sum' => '$total']
                    ]
                ],
                ['$sort' => ['total' => -1]]
            ];

            $result = $this->collection->aggregate($pipeline)->toArray();
            return array_map(function($item) {
                return [
                    'metodo_pago' => $item['_id'],
                    'cantidad' => $item['cantidad'],
                    'total' => $item['total']
                ];
            }, $result);
        } catch (\Exception $e) {
            error_log("Error getting sales by payment method: " . $e->getMessage());
            return [];
        }
    }

    // Build query from filters
    private function buildQuery(array $filters): array
    {
        $query = [];

        if (isset($filters['usuario_id'])) {
            $query['usuario_id'] = $filters['usuario_id'];
        }

        if (isset($filters['estado'])) {
            $query['estado'] = $filters['estado'];
        }

        if (isset($filters['estado_pago'])) {
            $query['estado_pago'] = $filters['estado_pago'];
        }

        if (isset($filters['metodo_pago'])) {
            $query['metodo_pago'] = $filters['metodo_pago'];
        }

        if (isset($filters['fecha_desde'])) {
            $query['fecha_compra']['$gte'] = new UTCDateTime(strtotime($filters['fecha_desde']) * 1000);
        }

        if (isset($filters['fecha_hasta'])) {
            $query['fecha_compra']['$lte'] = new UTCDateTime(strtotime($filters['fecha_hasta']) * 1000);
        }

        return $query;
    }
}
