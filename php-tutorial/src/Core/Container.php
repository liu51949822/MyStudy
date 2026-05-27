<?php
namespace App\Core;

class Container {
    private array $bindings = [];
    private array $instances = [];

    public function set(string $id, callable $factory): void {
        $this->bindings[$id] = $factory;
    }

    public function get(string $id): mixed {
        if (!isset($this->instances[$id])) {
            $this->instances[$id] = $this->bindings[$id]($this);
        }
        return $this->instances[$id];
    }
}
