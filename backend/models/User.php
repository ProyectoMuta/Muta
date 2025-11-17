<?php

namespace Models;

class User
{
    public ?int $id = null;
    public string $nombre;
    public string $email;
    public ?string $password_hash = null;
    public ?string $google_id = null;
    public string $rol = 'cliente';
    public string $estado = 'Activo';
    public ?string $reset_token = null;
    public ?string $reset_token_expires_at = null;

    // Extended data from MongoDB
    public array $favoritos = [];
    public array $carrito = [];
    public array $direcciones = ['domicilios' => [], 'punto' => null];
    public ?string $envioSeleccionado = null;
    public ?array $pago = null;

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
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'email' => $this->email,
            'rol' => $this->rol,
            'estado' => $this->estado,
        ];
    }

    public function toArrayWithExtendedData(): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'email' => $this->email,
            'rol' => $this->rol,
            'estado' => $this->estado,
            'favoritos' => $this->favoritos,
            'carrito' => $this->carrito,
            'direcciones' => $this->direcciones,
            'envioSeleccionado' => $this->envioSeleccionado,
            'pago' => $this->pago,
        ];
    }

    public function setPassword(string $password): void
    {
        $this->password_hash = password_hash($password, PASSWORD_BCRYPT);
    }

    public function verifyPassword(string $password): bool
    {
        return password_verify($password, $this->password_hash);
    }

    public function isAdmin(): bool
    {
        return $this->rol === 'admin';
    }

    public function isActive(): bool
    {
        return $this->estado === 'Activo';
    }
}
