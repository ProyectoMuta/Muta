<?php

namespace Models;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

class SystemConfig
{
    public ?ObjectId $_id = null;
    public string $key;
    public $value;
    public string $tipo; // 'string', 'number', 'boolean', 'json', 'array'
    public ?string $descripcion = null;
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

    public function getValue()
    {
        switch ($this->tipo) {
            case 'number':
                return is_numeric($this->value) ? (float)$this->value : 0;
            case 'boolean':
                return filter_var($this->value, FILTER_VALIDATE_BOOLEAN);
            case 'json':
                return is_string($this->value) ? json_decode($this->value, true) : $this->value;
            case 'array':
                return is_array($this->value) ? $this->value : [];
            default:
                return $this->value;
        }
    }

    public function setValue($value): void
    {
        $this->value = $value;
        $this->actualizado_en = new UTCDateTime();
    }
}
