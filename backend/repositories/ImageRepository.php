<?php

namespace Repositories;

use Models\Image;
use Config\Config;

class ImageRepository
{
    private string $uploadPath;
    private string $baseUrl;

    public function __construct()
    {
        $this->uploadPath = Config::get('upload')['path'] ?? __DIR__ . '/../../uploads/';
        $this->baseUrl = Config::get('base_url') ?? '';

        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    // UPLOAD image
    public function upload(array $file, ?string $entityType = null, ?string $entityId = null): ?Image
    {
        try {
            // Validate file
            $validation = $this->validateFile($file);
            if ($validation !== true) {
                throw new \Exception($validation);
            }

            // Generate unique filename
            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $filename = uniqid('img_', true) . '.' . $extension;
            $filePath = $this->uploadPath . $filename;

            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new \Exception("Failed to move uploaded file");
            }

            // Create Image model
            $image = new Image([
                'filename' => $filename,
                'path' => $filePath,
                'url' => $this->baseUrl . '/uploads/' . $filename,
                'size' => $file['size'],
                'mime_type' => $file['type'],
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ]);

            return $image;
        } catch (\Exception $e) {
            error_log("Error uploading image: " . $e->getMessage());
            throw $e;
        }
    }

    // UPLOAD from base64
    public function uploadFromBase64(string $base64Data, ?string $entityType = null, ?string $entityId = null): ?Image
    {
        try {
            // Extract mime type and data
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
                $extension = $matches[1];
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
            } else {
                throw new \Exception("Invalid base64 image data");
            }

            // Validate extension
            $allowedExtensions = Config::get('upload')['allowed_extensions'] ?? ['jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($extension, $allowedExtensions)) {
                throw new \Exception("Invalid file extension: {$extension}");
            }

            // Decode base64
            $imageData = base64_decode($base64Data);
            if ($imageData === false) {
                throw new \Exception("Failed to decode base64 data");
            }

            // Generate unique filename
            $filename = uniqid('img_', true) . '.' . $extension;
            $filePath = $this->uploadPath . $filename;

            // Save file
            if (file_put_contents($filePath, $imageData) === false) {
                throw new \Exception("Failed to save image file");
            }

            // Create Image model
            $image = new Image([
                'filename' => $filename,
                'path' => $filePath,
                'url' => $this->baseUrl . '/uploads/' . $filename,
                'size' => strlen($imageData),
                'mime_type' => 'image/' . $extension,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
            ]);

            return $image;
        } catch (\Exception $e) {
            error_log("Error uploading image from base64: " . $e->getMessage());
            throw $e;
        }
    }

    // DELETE image
    public function delete(string $filename): bool
    {
        try {
            $filePath = $this->uploadPath . $filename;

            if (file_exists($filePath)) {
                return unlink($filePath);
            }

            return false;
        } catch (\Exception $e) {
            error_log("Error deleting image: " . $e->getMessage());
            return false;
        }
    }

    // DELETE by path
    public function deleteByPath(string $path): bool
    {
        try {
            if (file_exists($path)) {
                return unlink($path);
            }

            return false;
        } catch (\Exception $e) {
            error_log("Error deleting image by path: " . $e->getMessage());
            return false;
        }
    }

    // GET image info
    public function getInfo(string $filename): ?Image
    {
        try {
            $filePath = $this->uploadPath . $filename;

            if (!file_exists($filePath)) {
                return null;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $filePath);
            finfo_close($finfo);

            return new Image([
                'filename' => $filename,
                'path' => $filePath,
                'url' => $this->baseUrl . '/uploads/' . $filename,
                'size' => filesize($filePath),
                'mime_type' => $mimeType,
            ]);
        } catch (\Exception $e) {
            error_log("Error getting image info: " . $e->getMessage());
            return null;
        }
    }

    // Validate file
    private function validateFile(array $file): string|bool
    {
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return "Upload error: " . $file['error'];
        }

        // Check file size
        $maxSize = Config::get('upload')['max_size'] ?? 5242880; // 5MB
        if ($file['size'] > $maxSize) {
            return "File size exceeds maximum allowed size";
        }

        // Check file extension
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExtensions = Config::get('upload')['allowed_extensions'] ?? ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($extension, $allowedExtensions)) {
            return "Invalid file extension. Allowed: " . implode(', ', $allowedExtensions);
        }

        // Check mime type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!in_array($mimeType, $allowedMimes)) {
            return "Invalid file type";
        }

        return true;
    }

    // LIST all images
    public function listAll(): array
    {
        try {
            $images = [];
            $files = scandir($this->uploadPath);

            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..' && is_file($this->uploadPath . $file)) {
                    $image = $this->getInfo($file);
                    if ($image) {
                        $images[] = $image;
                    }
                }
            }

            return $images;
        } catch (\Exception $e) {
            error_log("Error listing images: " . $e->getMessage());
            return [];
        }
    }
}
