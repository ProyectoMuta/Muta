<?php

namespace Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class Brand
{
    public ?ObjectId $_id = null;
    public string $nombre;
    public string $descripcion;
    public ?UTCDateTime $actualizado_en = null;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                if ($key === '_id' && is_string($value)) {
                    $this->_id = new ObjectId($value);
                } elseif ($key === 'actualizado_en' && !($value instanceof UTCDateTime)) {
                    $this->actualizado_en = new UTCDateTime();
                } else {
                    $this->{$key} = $value;
                }
            }
        }

        if (!$this->actualizado_en) {
            $this->actualizado_en = new UTCDateTime();
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
        if (isset($data['actualizado_en']) && $data['actualizado_en'] instanceof UTCDateTime) {
            $data['actualizado_en'] = $data['actualizado_en']->toDateTime()->format('Y-m-d H:i:s');
        }
        return $data;
    }

    public function update(string $nombre, string $descripcion): void
    {
        $this->nombre = $nombre;
        $this->descripcion = $descripcion;
        $this->actualizado_en = new UTCDateTime();
    }
}
