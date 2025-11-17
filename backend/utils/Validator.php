<?php

namespace Utils;

class Validator
{
    private array $errors = [];

    public function required($value, string $field): self
    {
        if (empty($value) && $value !== '0' && $value !== 0) {
            $this->errors[$field][] = "El campo {$field} es requerido";
        }
        return $this;
    }

    public function email($value, string $field): self
    {
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = "El campo {$field} debe ser un email válido";
        }
        return $this;
    }

    public function min($value, int $min, string $field): self
    {
        if (!empty($value) && strlen($value) < $min) {
            $this->errors[$field][] = "El campo {$field} debe tener al menos {$min} caracteres";
        }
        return $this;
    }

    public function max($value, int $max, string $field): self
    {
        if (!empty($value) && strlen($value) > $max) {
            $this->errors[$field][] = "El campo {$field} no debe exceder {$max} caracteres";
        }
        return $this;
    }

    public function numeric($value, string $field): self
    {
        if (!empty($value) && !is_numeric($value)) {
            $this->errors[$field][] = "El campo {$field} debe ser numérico";
        }
        return $this;
    }

    public function minValue($value, $min, string $field): self
    {
        if (!empty($value) && $value < $min) {
            $this->errors[$field][] = "El campo {$field} debe ser mayor o igual a {$min}";
        }
        return $this;
    }

    public function maxValue($value, $max, string $field): self
    {
        if (!empty($value) && $value > $max) {
            $this->errors[$field][] = "El campo {$field} debe ser menor o igual a {$max}";
        }
        return $this;
    }

    public function in($value, array $options, string $field): self
    {
        if (!empty($value) && !in_array($value, $options, true)) {
            $this->errors[$field][] = "El campo {$field} debe ser uno de: " . implode(', ', $options);
        }
        return $this;
    }

    public function isValid(): bool
    {
        return empty($this->errors);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function reset(): void
    {
        $this->errors = [];
    }
}
