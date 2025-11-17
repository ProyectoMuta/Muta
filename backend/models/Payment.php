<?php

namespace Models;

class Payment
{
    public string $metodo; // 'mercadopago', 'transferencia', etc.
    public ?string $preference_id = null;
    public ?string $payment_id = null;
    public ?string $status = null;
    public ?string $status_detail = null;
    public ?float $transaction_amount = null;
    public ?array $payer = null;
    public ?array $metadata = null;
    public ?string $external_reference = null;
    public ?string $date_created = null;
    public ?string $date_approved = null;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                $this->{$key} = $value;
            }
        }
    }

    public function toArray(): array
    {
        return array_filter(get_object_vars($this), function($value) {
            return $value !== null;
        });
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' || $this->status === 'in_process';
    }

    public function isRejected(): bool
    {
        return in_array($this->status, ['rejected', 'cancelled', 'refunded', 'charged_back']);
    }

    public function getEstadoPago(): string
    {
        if ($this->isApproved()) {
            return 'aprobado';
        } elseif ($this->isPending()) {
            return 'pendiente';
        } elseif ($this->isRejected()) {
            return 'rechazado';
        }
        return 'pendiente';
    }
}
