<?php

namespace Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Product
{
    public ?ObjectId $_id = null;
    public string $nombre;
    public string $descripcion;
    public int $precio;
    public int $precioPromo;
    public int $costo;
    public string $tipoVariante;
    public string $categoria;
    public string $subcategoria;
    public string $categoriaSlug;
    public string $subcategoriaSlug;
    public array $imagenes = [];
    public array $variantes = [];
    public int $stock = 0;
    public string $estado = 'Activo';
    public bool $publicable = true;
    public bool $eliminado = false;
    public ?UTCDateTime $fechaAlta = null;
    public bool $newArrival = false;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                if ($key === '_id' && is_string($value)) {
                    $this->_id = new ObjectId($value);
                } elseif ($key === 'fechaAlta' && !($value instanceof UTCDateTime)) {
                    $this->fechaAlta = new UTCDateTime();
                } else {
                    $this->{$key} = $value;
                }
            }
        }

        if (!$this->fechaAlta) {
            $this->fechaAlta = new UTCDateTime();
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
        if (isset($data['fechaAlta']) && $data['fechaAlta'] instanceof UTCDateTime) {
            $data['fechaAlta'] = $data['fechaAlta']->toDateTime()->format('Y-m-d H:i:s');
        }
        return $data;
    }

    public function calculateTotalStock(): int
    {
        $total = 0;
        foreach ($this->variantes as $variante) {
            $total += $variante['stock'] ?? 0;
        }
        return $total;
    }

    public function updateEstado(): void
    {
        if ($this->eliminado) {
            $this->estado = 'Eliminado';
        } elseif ($this->stock === 0) {
            $this->estado = 'Sin stock';
        } elseif ($this->stock <= 5) {
            $this->estado = 'Bajo stock';
        } else {
            $this->estado = 'Activo';
        }
    }
}
