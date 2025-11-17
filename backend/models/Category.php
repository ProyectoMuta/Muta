<?php

namespace Models;

use MongoDB\BSON\ObjectId;

class Category
{
    public ?ObjectId $_id = null;
    public string $nombre;
    public string $slug;
    public bool $enabled = true;
    public ?string $imagen = null;
    public array $subs = [];

    public function __construct(array $data = [])
    {
        foreach ($data as $key => $value) {
            if (property_exists($this, $key)) {
                if ($key === '_id' && is_string($value)) {
                    $this->_id = new ObjectId($value);
                } else {
                    $this->{$key} = $value;
                }
            }
        }

        if (!$this->slug && isset($this->nombre)) {
            $this->slug = $this->generateSlug($this->nombre);
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
        return $data;
    }

    private function generateSlug(string $text): string
    {
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
        $text = preg_replace('/[\s-]+/', '-', $text);
        return trim($text, '-');
    }

    public function addSubcategory(string $nombre, string $slug, bool $enabled = true): void
    {
        $this->subs[] = [
            'nombre' => $nombre,
            'slug' => $slug,
            'enabled' => $enabled
        ];
    }

    public function removeSubcategory(string $slug): void
    {
        $this->subs = array_filter($this->subs, function($sub) use ($slug) {
            return $sub['slug'] !== $slug;
        });
        $this->subs = array_values($this->subs);
    }
}
