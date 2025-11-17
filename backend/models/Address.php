<?php

namespace Models;

class Address
{
    public string $id;
    public string $tipo; // 'domicilio' o 'punto'
    public ?string $calle = null;
    public ?string $numero = null;
    public ?string $piso = null;
    public ?string $depto = null;
    public ?string $localidad = null;
    public ?string $provincia = null;
    public ?string $codigo_postal = null;
    public ?string $telefono = null;
    public ?string $nombre_contacto = null;
    public ?string $punto_id = null;
    public ?string $punto_nombre = null;
    public ?string $punto_direccion = null;
    public bool $seleccionado = false;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                $this->{$key} = $value;
            }
        }

        if (!isset($this->id)) {
            $this->id = uniqid('addr_', true);
        }
    }

    public function toArray(): array
    {
        return array_filter(get_object_vars($this), function($value) {
            return $value !== null;
        });
    }

    public function getFullAddress(): string
    {
        if ($this->tipo === 'punto' && $this->punto_direccion) {
            return $this->punto_direccion;
        }

        $parts = array_filter([
            $this->calle,
            $this->numero,
            $this->piso ? "Piso {$this->piso}" : null,
            $this->depto ? "Depto {$this->depto}" : null,
            $this->localidad,
            $this->provincia,
            $this->codigo_postal ? "CP {$this->codigo_postal}" : null,
        ]);

        return implode(', ', $parts);
    }
}
