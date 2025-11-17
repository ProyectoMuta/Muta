# MUTA - Documentación de API REST

## Índice
1. [Descripción General](#descripción-general)
2. [Autenticación](#autenticación)
3. [Endpoints de Productos](#endpoints-de-productos)
4. [Endpoints de Usuarios](#endpoints-de-usuarios)
5. [Endpoints de Autenticación](#endpoints-de-autenticación)
6. [Endpoints de Pedidos](#endpoints-de-pedidos)
7. [Endpoints de Categorías](#endpoints-de-categorías)
8. [Endpoints de Marca](#endpoints-de-marca)
9. [Endpoints de Carrito](#endpoints-de-carrito)
10. [Endpoints de Favoritos](#endpoints-de-favoritos)
11. [Endpoints de Imágenes](#endpoints-de-imágenes)
12. [Endpoints de Analytics](#endpoints-de-analytics)
13. [Códigos de Respuesta](#códigos-de-respuesta)

---

## Descripción General

Base URL: `http://localhost:10000/backend` (desarrollo)

Base URL (producción): `https://your-app.onrender.com/backend`

Todas las respuestas son en formato JSON con la siguiente estructura:

```json
{
  "success": true|false,
  "message": "Mensaje descriptivo",
  "data": { ... } | [ ... ] | null,
  "errors": { ... } | null
}
```

---

## Autenticación

La API utiliza sesiones para autenticación. Después de hacer login, la sesión se mantiene mediante cookies.

Para endpoints que requieren autenticación:
- 🔒 **Requiere autenticación** - Usuario debe estar logueado
- 👑 **Requiere admin** - Usuario debe tener rol de administrador

---

## Endpoints de Productos

### GET /api/products
Obtiene lista de productos con paginación y filtros.

**Query Parameters:**
- `limit` (int): Cantidad de productos por página (default: 20)
- `skip` (int): Productos a saltar (default: 0)
- `page` (int): Número de página (default: 1)
- `categoria` (string): Filtrar por slug de categoría
- `subcategoria` (string): Filtrar por slug de subcategoría
- `estado` (string): Filtrar por estado (Activo, Bajo stock, Sin stock, Pausado)
- `search` (string): Búsqueda por nombre o descripción
- `newArrival` (boolean): Solo productos nuevos

**Respuesta:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "products": [...],
    "total": 100,
    "limit": 20,
    "skip": 0,
    "page": 1,
    "totalPages": 5
  }
}
```

### GET /api/products/:id
Obtiene un producto por su ID.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "nombre": "Remera Clásica",
    "descripcion": "...",
    "precio": 5000,
    "stock": 10,
    ...
  }
}
```

### POST /api/products
👑 Crea un nuevo producto.

**Body:**
```json
{
  "nombre": "Producto Nuevo",
  "descripcion": "Descripción del producto",
  "precio": 5000,
  "precioPromo": 4000,
  "costo": 3000,
  "categoria": "Remeras",
  "categoriaSlug": "remeras",
  "subcategoria": "Manga Corta",
  "subcategoriaSlug": "manga-corta",
  "tipoVariante": "talle-color",
  "variantes": [
    {
      "talle": "M",
      "color": "Rojo",
      "stock": 10,
      "peso": 0.3
    }
  ],
  "imagenes": [],
  "publicable": true,
  "newArrival": false
}
```

### PUT /api/products/:id
👑 Actualiza un producto existente.

### DELETE /api/products/:id
👑 Elimina (soft delete) un producto.

### GET /api/products/new-arrivals
Obtiene productos marcados como nuevos.

**Query Parameters:**
- `limit` (int): Cantidad de productos (default: 10)

### GET /api/products/search
Busca productos por texto.

**Query Parameters:**
- `q` (string): Término de búsqueda (requerido)
- `limit` (int): Cantidad de resultados (default: 20)

### POST /api/products/:id/stock
👑 Actualiza el stock total de un producto.

**Body:**
```json
{
  "stock": 50
}
```

### POST /api/products/:id/variants/stock
👑 Actualiza el stock de una variante específica.

**Body:**
```json
{
  "color": "Rojo",
  "talle": "M",
  "stock": 25
}
```

### POST /api/products/:id/images
👑 Sube una imagen para un producto.

**Body:** FormData con campo `image`

### GET /api/products/check-stock
Verifica el stock de múltiples productos.

**Query Parameters:**
- `ids` (string): IDs de productos separados por coma

---

## Endpoints de Usuarios

### GET /api/users
👑 Obtiene lista de usuarios.

**Query Parameters:**
- `limit` (int): Cantidad de usuarios (default: 20)
- `offset` (int): Usuarios a saltar (default: 0)

### GET /api/users/:id
🔒 Obtiene un usuario por ID. Los usuarios solo pueden ver su propia información a menos que sean admin.

### POST /api/users
👑 Crea un nuevo usuario.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "rol": "cliente"
}
```

### PUT /api/users/:id
🔒 Actualiza un usuario. Los usuarios solo pueden actualizar su propia información.

### DELETE /api/users/:id
👑 Elimina un usuario.

---

## Endpoints de Autenticación

### POST /api/auth/register
Registra un nuevo usuario.

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

### POST /api/auth/login
Inicia sesión.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "rol": "cliente"
    }
  }
}
```

### POST /api/auth/logout
🔒 Cierra sesión.

### POST /api/auth/forgot-password
Solicita recuperación de contraseña.

**Body:**
```json
{
  "email": "juan@example.com"
}
```

### POST /api/auth/reset-password
Restablece la contraseña con token.

**Body:**
```json
{
  "token": "abc123...",
  "password": "newpassword123"
}
```

---

## Endpoints de Pedidos

### GET /api/orders
🔒 Obtiene pedidos. Los usuarios ven solo sus pedidos, los admin ven todos.

**Query Parameters:**
- `limit` (int): Cantidad de pedidos (default: 20)
- `skip` (int): Pedidos a saltar (default: 0)
- `estado` (string): Filtrar por estado

### GET /api/orders/:id
🔒 Obtiene un pedido por ID.

### POST /api/orders
🔒 Crea un nuevo pedido.

**Body:**
```json
{
  "productos": [
    {
      "producto_id": "507f...",
      "nombre": "Remera",
      "cantidad": 2,
      "precio": 5000,
      "color": "Rojo",
      "talle": "M"
    }
  ],
  "direccion_envio": {
    "calle": "Av. Corrientes",
    "numero": "1234",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "codigo_postal": "1000"
  },
  "subtotal": 10000,
  "costo_envio": 500,
  "descuento": 0,
  "metodo_pago": "mercadopago"
}
```

### PUT /api/orders/:id
👑 Actualiza un pedido.

### PUT /api/orders/:id/status
👑 Actualiza el estado de un pedido.

**Body:**
```json
{
  "estado": "enviado",
  "nota": "Pedido despachado por Correo Argentino"
}
```

Estados posibles: `en_espera`, `pagado`, `enviado`, `recibido`, `cancelado`

### DELETE /api/orders/:id
👑 Elimina un pedido.

---

## Endpoints de Categorías

### GET /api/categories
Obtiene todas las categorías.

**Query Parameters:**
- `enabled` (boolean): Solo categorías habilitadas

### GET /api/categories/:id
Obtiene una categoría por ID.

### POST /api/categories
👑 Crea una nueva categoría.

**Body:**
```json
{
  "nombre": "Remeras",
  "slug": "remeras",
  "enabled": true,
  "imagen": "url-imagen.jpg",
  "subs": [
    {
      "nombre": "Manga Corta",
      "slug": "manga-corta",
      "enabled": true
    }
  ]
}
```

### PUT /api/categories/:id
👑 Actualiza una categoría.

### DELETE /api/categories/:id
👑 Elimina una categoría.

---

## Endpoints de Marca

### GET /api/brand
Obtiene información de la marca.

### POST /api/brand
👑 Crea/actualiza información de la marca.

**Body:**
```json
{
  "nombre": "MUTA",
  "descripcion": "Marca de ropa..."
}
```

### PUT /api/brand/:id
👑 Actualiza la marca.

### DELETE /api/brand/:id
👑 Elimina la marca.

---

## Endpoints de Carrito

### GET /api/cart
🔒 Obtiene el carrito del usuario actual.

### POST /api/cart
🔒 Actualiza todo el carrito.

**Body:**
```json
{
  "cart": [
    {
      "producto_id": "507f...",
      "nombre": "Remera",
      "cantidad": 2,
      "precio": 5000,
      "color": "Rojo",
      "talle": "M"
    }
  ]
}
```

### POST /api/cart/add
🔒 Agrega un producto al carrito.

**Body:**
```json
{
  "producto_id": "507f...",
  "nombre": "Remera",
  "cantidad": 1,
  "precio": 5000,
  "color": "Rojo",
  "talle": "M"
}
```

### POST /api/cart/remove
🔒 Elimina un producto del carrito.

**Body:**
```json
{
  "producto_id": "507f...",
  "color": "Rojo",
  "talle": "M"
}
```

### DELETE /api/cart
🔒 Vacía el carrito.

---

## Endpoints de Favoritos

### GET /api/favorites
🔒 Obtiene favoritos del usuario.

### POST /api/favorites/add
🔒 Agrega un producto a favoritos.

**Body:**
```json
{
  "producto_id": "507f..."
}
```

### POST /api/favorites/remove
🔒 Elimina un producto de favoritos.

**Body:**
```json
{
  "producto_id": "507f..."
}
```

### POST /api/favorites/toggle
🔒 Alterna favorito (agrega si no está, elimina si está).

**Body:**
```json
{
  "producto_id": "507f..."
}
```

---

## Endpoints de Imágenes

### GET /api/images
👑 Lista todas las imágenes.

### POST /api/images
👑 Sube una imagen.

**Body:** FormData con campo `image`

### DELETE /api/images/:filename
👑 Elimina una imagen.

---

## Endpoints de Analytics

### GET /api/analytics/statistics
👑 Obtiene estadísticas de ventas.

**Query Parameters:**
- `days` (int): Días hacia atrás (default: 30)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "total_ventas": 150000,
    "total_pedidos": 25,
    "promedio_venta": 6000
  }
}
```

### GET /api/analytics/best-selling
👑 Obtiene productos más vendidos.

**Query Parameters:**
- `limit` (int): Cantidad de productos (default: 10)

### GET /api/analytics/by-payment-method
👑 Obtiene ventas por método de pago.

---

## Códigos de Respuesta

- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Error en la solicitud
- `401 Unauthorized` - No autenticado
- `403 Forbidden` - Sin permisos
- `404 Not Found` - Recurso no encontrado
- `500 Internal Server Error` - Error del servidor

---

## Ejemplos de Uso

### JavaScript/Fetch

```javascript
// Login
const response = await fetch('http://localhost:10000/backend/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
console.log(data);

// Obtener productos
const products = await fetch('http://localhost:10000/backend/api/products?limit=10', {
  credentials: 'include'
});

const productsData = await products.json();
console.log(productsData);
```

### cURL

```bash
# Login
curl -X POST http://localhost:10000/backend/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}' \
  -c cookies.txt

# Obtener productos (usando cookies)
curl -X GET http://localhost:10000/backend/api/products \
  -b cookies.txt
```

---

## Notas Importantes

1. **CORS**: El backend está configurado para aceptar requests del frontend. Asegúrate de configurar `CORS_ALLOWED_ORIGINS` en el `.env`.

2. **Sesiones**: Las sesiones se manejan mediante cookies. Asegúrate de incluir `credentials: 'include'` en tus requests de fetch.

3. **Paginación**: La mayoría de endpoints que devuelven listas soportan paginación mediante `limit` y `skip` o `page`.

4. **Filtros**: Muchos endpoints soportan filtros mediante query parameters. Consulta la documentación de cada endpoint.

5. **Validación**: Todos los endpoints validan los datos de entrada. Los errores de validación se devuelven con código 400 y un objeto `errors` con los detalles.

6. **Seguridad**: Los endpoints de administración están protegidos. Asegúrate de tener un usuario admin creado para acceder a ellos.
