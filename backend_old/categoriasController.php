<?php
header("Content-Type: application/json; charset=UTF-8");
echo json_encode([
  ["nombre" => "Remeras", "subcategorias" => ["Manga corta", "Manga larga"]],
  ["nombre" => "Pantalones", "subcategorias" => ["Jeans", "Joggers"]],
]);
