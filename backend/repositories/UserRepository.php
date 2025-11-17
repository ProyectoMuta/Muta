<?php

namespace Repositories;

use Config\Database;
use Config\MongoDB;
use Models\User;
use PDO;

class UserRepository
{
    private PDO $db;
    private $mongoCollection;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->mongoCollection = MongoDB::getInstance()->usuarios_datos;
    }

    // CREATE
    public function create(User $user): ?int
    {
        try {
            $sql = "INSERT INTO usuarios (nombre, email, password_hash, google_id, rol, estado)
                    VALUES (:nombre, :email, :password_hash, :google_id, :rol, :estado)";

            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':nombre' => $user->nombre,
                ':email' => $user->email,
                ':password_hash' => $user->password_hash,
                ':google_id' => $user->google_id,
                ':rol' => $user->rol,
                ':estado' => $user->estado,
            ]);

            $userId = (int) $this->db->lastInsertId();

            // Create extended data in MongoDB
            $this->mongoCollection->insertOne([
                'id_usuario' => $userId,
                'favoritos' => [],
                'carrito' => [],
                'direcciones' => ['domicilios' => [], 'punto' => null],
                'envioSeleccionado' => null,
                'pago' => null,
            ]);

            return $userId;
        } catch (\Exception $e) {
            error_log("Error creating user: " . $e->getMessage());
            throw $e;
        }
    }

    // READ - Find by ID
    public function findById(int $id, bool $includeExtended = false): ?User
    {
        try {
            $sql = "SELECT * FROM usuarios WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id]);
            $data = $stmt->fetch();

            if (!$data) {
                return null;
            }

            $user = new User($data);

            if ($includeExtended) {
                $extendedData = $this->getExtendedData($id);
                if ($extendedData) {
                    $user->favoritos = $extendedData['favoritos'] ?? [];
                    $user->carrito = $extendedData['carrito'] ?? [];
                    $user->direcciones = $extendedData['direcciones'] ?? ['domicilios' => [], 'punto' => null];
                    $user->envioSeleccionado = $extendedData['envioSeleccionado'] ?? null;
                    $user->pago = $extendedData['pago'] ?? null;
                }
            }

            return $user;
        } catch (\Exception $e) {
            error_log("Error finding user: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by email
    public function findByEmail(string $email, bool $includeExtended = false): ?User
    {
        try {
            $sql = "SELECT * FROM usuarios WHERE email = :email";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':email' => $email]);
            $data = $stmt->fetch();

            if (!$data) {
                return null;
            }

            $user = new User($data);

            if ($includeExtended) {
                $extendedData = $this->getExtendedData($user->id);
                if ($extendedData) {
                    $user->favoritos = $extendedData['favoritos'] ?? [];
                    $user->carrito = $extendedData['carrito'] ?? [];
                    $user->direcciones = $extendedData['direcciones'] ?? ['domicilios' => [], 'punto' => null];
                    $user->envioSeleccionado = $extendedData['envioSeleccionado'] ?? null;
                    $user->pago = $extendedData['pago'] ?? null;
                }
            }

            return $user;
        } catch (\Exception $e) {
            error_log("Error finding user by email: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by Google ID
    public function findByGoogleId(string $googleId): ?User
    {
        try {
            $sql = "SELECT * FROM usuarios WHERE google_id = :google_id";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':google_id' => $googleId]);
            $data = $stmt->fetch();

            return $data ? new User($data) : null;
        } catch (\Exception $e) {
            error_log("Error finding user by Google ID: " . $e->getMessage());
            return null;
        }
    }

    // READ - Find by reset token
    public function findByResetToken(string $token): ?User
    {
        try {
            $sql = "SELECT * FROM usuarios WHERE reset_token = :token AND reset_token_expires_at > NOW()";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':token' => $token]);
            $data = $stmt->fetch();

            return $data ? new User($data) : null;
        } catch (\Exception $e) {
            error_log("Error finding user by reset token: " . $e->getMessage());
            return null;
        }
    }

    // READ - Get all users
    public function findAll(int $limit = 20, int $offset = 0): array
    {
        try {
            $sql = "SELECT * FROM usuarios ORDER BY id DESC LIMIT :limit OFFSET :offset";
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $users = [];
            while ($data = $stmt->fetch()) {
                $users[] = new User($data);
            }
            return $users;
        } catch (\Exception $e) {
            error_log("Error finding users: " . $e->getMessage());
            return [];
        }
    }

    // READ - Count users
    public function count(): int
    {
        try {
            $sql = "SELECT COUNT(*) as total FROM usuarios";
            $stmt = $this->db->query($sql);
            $result = $stmt->fetch();
            return (int) $result['total'];
        } catch (\Exception $e) {
            error_log("Error counting users: " . $e->getMessage());
            return 0;
        }
    }

    // UPDATE
    public function update(int $id, User $user): bool
    {
        try {
            $sql = "UPDATE usuarios SET
                    nombre = :nombre,
                    email = :email,
                    rol = :rol,
                    estado = :estado
                    WHERE id = :id";

            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':id' => $id,
                ':nombre' => $user->nombre,
                ':email' => $user->email,
                ':rol' => $user->rol,
                ':estado' => $user->estado,
            ]);
        } catch (\Exception $e) {
            error_log("Error updating user: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Password
    public function updatePassword(int $id, string $passwordHash): bool
    {
        try {
            $sql = "UPDATE usuarios SET password_hash = :password_hash WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':id' => $id,
                ':password_hash' => $passwordHash,
            ]);
        } catch (\Exception $e) {
            error_log("Error updating password: " . $e->getMessage());
            throw $e;
        }
    }

    // UPDATE - Reset token
    public function updateResetToken(int $id, ?string $token, ?string $expiresAt): bool
    {
        try {
            $sql = "UPDATE usuarios SET
                    reset_token = :token,
                    reset_token_expires_at = :expires_at
                    WHERE id = :id";

            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':id' => $id,
                ':token' => $token,
                ':expires_at' => $expiresAt,
            ]);
        } catch (\Exception $e) {
            error_log("Error updating reset token: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE
    public function delete(int $id): bool
    {
        try {
            // Delete from MySQL
            $sql = "DELETE FROM usuarios WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([':id' => $id]);

            // Delete from MongoDB
            if ($result) {
                $this->mongoCollection->deleteOne(['id_usuario' => $id]);
            }

            return $result;
        } catch (\Exception $e) {
            error_log("Error deleting user: " . $e->getMessage());
            throw $e;
        }
    }

    // Get extended data from MongoDB
    private function getExtendedData(int $userId): ?array
    {
        try {
            $document = $this->mongoCollection->findOne(['id_usuario' => $userId]);
            return $document ? (array) $document : null;
        } catch (\Exception $e) {
            error_log("Error getting extended data: " . $e->getMessage());
            return null;
        }
    }

    // Update extended data in MongoDB
    public function updateExtendedData(int $userId, array $data): bool
    {
        try {
            $result = $this->mongoCollection->updateOne(
                ['id_usuario' => $userId],
                ['$set' => $data],
                ['upsert' => true]
            );
            return $result->getModifiedCount() > 0 || $result->getUpsertedCount() > 0;
        } catch (\Exception $e) {
            error_log("Error updating extended data: " . $e->getMessage());
            throw $e;
        }
    }
}
