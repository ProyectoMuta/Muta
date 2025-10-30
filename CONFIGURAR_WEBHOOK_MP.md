# ⚙️ Configuración del Webhook de Mercado Pago

Este documento explica cómo configurar el webhook de Mercado Pago para que tu aplicación actualice automáticamente el estado de los pedidos y descuente el stock cuando se aprueba un pago.

---

## 📋 ¿Qué hace el Webhook?

Cuando un usuario completa un pago en Mercado Pago, el webhook:

1. ✅ Actualiza el `estado_pago` del pedido a **"aprobado"**
2. ✅ Cambia el `estado` del pedido a **"pagado"**
3. ✅ Guarda la `fecha_pago` en el pedido
4. ✅ **Descuenta automáticamente el stock** de los productos vendidos
5. ✅ Actualiza el estado de los productos (Activo → Bajo stock → Sin stock)
6. ✅ Registra todo en el log para auditoría

---

## 🚀 Paso 1: Verificar la URL del Webhook

Tu webhook está configurado en `backend/mp-config.php`:

```php
define('MP_NOTIFICATION_URL', BASE_URL . '/backend/mp-webhook.php');
```

**URL actual**: `https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php`

⚠️ **IMPORTANTE**: Esta URL debe ser:
- Accesible públicamente desde Internet
- Con HTTPS (requerido por Mercado Pago)
- Sin autenticación ni restricciones

---

## 🔧 Paso 2: Configurar el Webhook en Mercado Pago

### Opción A: Configuración Automática (Recomendado)

El webhook se configura automáticamente cuando creas una preferencia de pago desde tu código. Mercado Pago usa la URL definida en:

```php
'notification_url' => MP_NOTIFICATION_URL
```

✅ **No requiere configuración manual** en el panel de Mercado Pago.

### Opción B: Configuración Manual (Opcional)

Si quieres configurarlo manualmente en el panel:

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. Selecciona tu aplicación
3. Ve a **"Webhooks"** o **"Notificaciones"**
4. Haz clic en **"Configurar Webhooks"**
5. Ingresa la URL:
   ```
   https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php
   ```
6. Selecciona el evento: **"payment"**
7. Guarda la configuración

---

## 🧪 Paso 3: Probar el Webhook

### Método 1: Realizar un Pago de Prueba

1. Usa tu aplicación para crear un pedido
2. Paga con una tarjeta de prueba de Mercado Pago:

   **Tarjeta Aprobada:**
   - Número: `5031 7557 3453 0604`
   - Vencimiento: Cualquier fecha futura
   - CVV: `123`
   - Nombre: `APRO`

3. Mercado Pago aprobará el pago y enviará la notificación
4. Verifica los logs en `backend/logs/mp-notifications.log`

### Método 2: Usar el Script de Prueba

```bash
# Desde la terminal
php backend/test-webhook.php

# O desde el navegador
https://tu-dominio.com/backend/test-webhook.php?payment_id=1234567890
```

---

## 📊 Verificar que Funciona

### 1. Revisar el Log del Webhook

```bash
tail -f backend/logs/mp-notifications.log
```

Deberías ver algo como:

```
[2025-01-28 10:30:15] Webhook recibido - GET: {"topic":"payment","id":"1234567890"} | POST: {}
[2025-01-28 10:30:16] Procesando notificación - Topic: payment, ID: 1234567890
[2025-01-28 10:30:17] Pedido actualizado: MUTA-2025-00001 - Estado: pagado - Payment ID: 1234567890
[2025-01-28 10:30:17] Stock actualizado - Producto: 67890abc, Talle: M, Stock anterior: 10, Stock nuevo: 9
[2025-01-28 10:30:17] Stock descontado exitosamente - Producto: 67890abc, Pedido: MUTA-2025-00001, Stock total anterior: 10, Stock total nuevo: 9, Estado: Activo
```

### 2. Verificar en MongoDB

Comprueba que el pedido se actualizó:

```javascript
db.pedidos.findOne({ numero_pedido: "MUTA-2025-00001" })
```

Deberías ver:
```javascript
{
  estado: "pagado",              // ✅ Cambió de "en_espera" a "pagado"
  estado_pago: "aprobado",        // ✅ Cambió de "pendiente" a "aprobado"
  fecha_pago: ISODate("2025-..."), // ✅ Se registró la fecha
  mercadopago: {
    payment_id: "1234567890",
    status: "approved",
    ...
  }
}
```

### 3. Verificar el Stock

Comprueba que el stock se descontó:

```javascript
db.products.findOne({ _id: ObjectId("67890abc") })
```

Deberías ver:
```javascript
{
  stock: 9,                     // ✅ Se descontó 1 unidad
  variantes: [
    {
      talle: "M",
      stock: 9,                  // ✅ Stock de la variante actualizado
      ...
    }
  ],
  estado: "Activo"              // o "Bajo stock" si el stock <= 5
}
```

---

## 🔍 Diagnóstico de Problemas

### El estado_pago no se actualiza

**Posible causa**: El webhook no está siendo llamado por Mercado Pago

**Solución**:
1. Verifica que la URL sea accesible públicamente:
   ```bash
   curl https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php
   ```
2. Verifica en el panel de Mercado Pago si hay notificaciones fallidas
3. Revisa el log: `backend/logs/mp-notifications.log`

### El stock no se descuenta

**Posible causa**: El webhook no encuentra el producto o el talle no coincide

**Solución**:
1. Verifica el log para ver errores:
   ```bash
   grep "Error procesando producto" backend/logs/mp-notifications.log
   ```
2. Asegúrate de que el `producto_id` en el pedido sea válido
3. Verifica que el `talle` en el pedido coincida exactamente con el de la variante

### Errores de permisos

**Síntoma**: No se crea el archivo de log

**Solución**:
```bash
mkdir -p backend/logs
chmod 777 backend/logs
```

---

## 🔐 Seguridad

### Validar Origen del Webhook (Recomendado para Producción)

Agrega validación de IP de Mercado Pago en `mp-webhook.php`:

```php
// IPs permitidas de Mercado Pago
$allowedIPs = [
    '209.225.49.0/24',    // Rango de IPs de MP
    '216.33.197.0/24',
    '216.33.196.0/24'
];

$clientIP = $_SERVER['REMOTE_ADDR'];
// Validar IP aquí
```

### Validar Firma (Opcional)

Mercado Pago puede enviar una firma para validar la autenticidad:

```php
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
// Validar firma según documentación de MP
```

---

## 📚 Recursos Adicionales

- [Documentación de Webhooks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel)

---

## 🚀 Pasar a Producción

Cuando estés listo para producción:

1. **Actualiza las credenciales** en `mp-config.php`:
   ```php
   define('MP_ACCESS_TOKEN', 'APP-TU_ACCESS_TOKEN_PRODUCCION');
   define('MP_PUBLIC_KEY', 'APP-TU_PUBLIC_KEY_PRODUCCION');
   define('MP_SANDBOX_MODE', false);  // ⚠️ Cambiar a false
   ```

2. **Actualiza la BASE_URL**:
   ```php
   define('BASE_URL', 'https://tudominio.com');
   ```

3. **Verifica el webhook en producción**:
   - La URL debe ser HTTPS
   - Debe estar accesible públicamente
   - No debe tener autenticación

4. **Elimina el script de prueba**:
   ```bash
   rm backend/test-webhook.php
   ```

---

## ✅ Checklist de Configuración

- [ ] URL del webhook configurada en `mp-config.php`
- [ ] URL accesible públicamente (prueba con curl)
- [ ] Carpeta `backend/logs/` creada con permisos de escritura
- [ ] Webhook probado con pago de prueba
- [ ] Log generado correctamente
- [ ] Estado del pedido se actualiza a "pagado"
- [ ] Stock se descuenta automáticamente
- [ ] Producto cambia a "Bajo stock" o "Sin stock" si corresponde

---

¡Listo! Tu integración de Mercado Pago ahora actualiza automáticamente los pedidos y descuenta el stock. 🎉
