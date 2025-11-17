<?php

namespace Models;

class Image
{
    public string $filename;
    public string $path;
    public string $url;
    public int $size;
    public string $mime_type;
    public ?string $entity_type = null;
    public ?string $entity_id = null;
    public ?string $uploaded_at = null;

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                $this->{$key} = $value;
            }
        }

        if (!$this->uploaded_at) {
            $this->uploaded_at = date('Y-m-d H:i:s');
        }
    }

    public function toArray(): array
    {
        return get_object_vars($this);
    }

    public function delete(): bool
    {
        if (file_exists($this->path)) {
            return unlink($this->path);
        }
        return false;
    }

    public function exists(): bool
    {
        return file_exists($this->path);
    }

    public function getExtension(): string
    {
        return pathinfo($this->filename, PATHINFO_EXTENSION);
    }

    public function getSizeInMB(): float
    {
        return round($this->size / 1024 / 1024, 2);
    }
}
