# ✅ Checklist de Verificación - Integración Mercado Pago

## 📋 Verificación Paso a Paso

Usa este checklist para asegurarte de que todo funciona correctamente antes de pasar a producción.

---

## 🔧 1. CONFIGURACIÓN INICIAL

### 1.1 Instalación
- [ ] SDK de Mercado Pago instalado (`composer install` ejecutado)
- [ ] Directorio `backend/vendor/mercadopago/dx-php/` existe
- [ ] MongoDB corriendo y accesible
- [ ] Ngrok instalado (para desarrollo local)

### 1.2 Credenciales
- [ ] Access Token configurado en `mp-config.php` o `.env`
- [ ] Public Key configurado
- [ ] Webhook Secret configurado (NO dejarlo como `TU_CLAVE_SECRETA_AQUI`)
- [ ] `MP_SANDBOX_MODE = true` (para pruebas)
- [ ] BASE_URL apunta a la URL correcta (ngrok o dominio)

### 1.3 Archivos Críticos
- [ ] `backend/mp-webhook.php` existe y es accesible
- [ ] `backend/logs/` directorio existe y es escribible
- [ ] `backend/mp-config.php` tiene las credenciales correctas
- [ ] `.env` en `.gitignore` (si usas .env)

**Comando de verificación:**
```bash
php backend/verificar-webhook.php
```

---

## 🔔 2. CONFIGURACIÓN DEL WEBHOOK

### 2.1 En el Panel de Mercado Pago
- [ ] Webhook configurado en https://www.mercadopago.com.ar/developers/panel
- [ ] URL correcta: `https://tu-url.ngrok-free.app/Muta/backend/mp-webhook.php`
- [ ] Evento **Pagos** activado
- [ ] Evento **Merchant Orders** activado (recomendado)
- [ ] Clave secreta copiada y guardada en `mp-config.php`

### 2.2 Accesibilidad
- [ ] Webhook URL accesible via HTTPS
- [ ] Ngrok corriendo (si es desarrollo local)
- [ ] URL responde con HTTP 200 al hacer POST

**Test manual:**
```bash
curl -X POST https://tu-url.ngrok-free.app/Muta/backend/mp-webhook.php?topic=payment&id=test123
```

**Respuesta esperada:** `{"success":true}`

---

## 🧪 3. PRUEBAS DE PAGO

### 3.1 Pago Aprobado (Tarjeta de Crédito)

#### Pasos:
1. Agregar producto al carrito
2. Proceder al checkout
3. Elegir "Pagar con Mercado Pago"
4. Usar tarjeta de prueba: `5031 7557 3453 0604`
5. CVV: 123, Vencimiento: 11/25, Doc: 12345678
6. Completar el pago

#### Verificaciones:
- [ ] Redirige a `payment-success.html`
- [ ] Webhook recibe notificación (verificar en logs)
- [ ] Firma del webhook validada correctamente
- [ ] Pago consultado exitosamente (HTTP 200)
- [ ] Pedido actualizado en MongoDB:
  - [ ] `estado = "pagado"`
  - [ ] `estado_pago = "aprobado"`
  - [ ] `mercadopago.payment_id` guardado
  - [ ] `mercadopago.payments_procesados[]` contiene el payment_id
  - [ ] `fecha_pago` guardada
- [ ] Stock descontado por producto/variante
- [ ] Estado del producto actualizado (si stock ≤ 5 → "Bajo stock")
- [ ] Email de confirmación enviado (si aplica)

**Verificar en logs:**
```bash
tail -f backend/logs/mp-notifications.log
```

**Buscar:**
```
✅ Firma del webhook validada correctamente
✅ Pago 1342060043 consultado exitosamente
✅ Payment ID 1342060043 es nuevo. Procesando...
Pedido actualizado: MUTA-XXX - Estado: pagado
Stock descontado - Producto: XXX, Talle: M
```

**Verificar en MongoDB:**
```javascript
db.pedidos.findOne({numero_pedido: "MUTA-XXX"})
// Debe mostrar:
{
  "estado": "pagado",
  "estado_pago": "aprobado",
  "mercadopago": {
    "payment_id": 1342060043,
    "status": "approved",
    "payments_procesados": [1342060043]
  }
}
```

---

### 3.2 Pago Rechazado

#### Pasos:
1. Agregar producto al carrito
2. Proceder al checkout
3. Usar tarjeta de prueba RECHAZADA: `4485 7412 4012 0015`
4. CVV: 123, Vencimiento: 11/25, Doc: 12345678
5. Intentar pagar

#### Verificaciones:
- [ ] Redirige a `payment-failure.html`
- [ ] Webhook recibe notificación (opcional, MP puede no notificar rechazos)
- [ ] Si recibe notificación:
  - [ ] Pedido actualizado: `estado_pago = "rechazado"`
  - [ ] `estado = "cancelado"`
- [ ] **Stock NO se descuenta** ⚠️ (crítico)
- [ ] Usuario puede reintentar el pago

**Verificar en MongoDB:**
```javascript
db.pedidos.findOne({numero_pedido: "MUTA-XXX"})
// Debe mostrar:
{
  "estado": "cancelado",
  "estado_pago": "rechazado"
  // NO debe tener fecha_pago
}
```

**Verificar stock:**
```javascript
db.products.findOne({_id: ObjectId("...")})
// El stock debe ser el MISMO que antes (no descontado)
```

---

### 3.3 Pago Pendiente (Rapipago/PagoFácil)

#### Pasos:
1. Agregar producto al carrito
2. Proceder al checkout
3. Elegir "Pagar en efectivo" → Rapipago o PagoFácil
4. Completar el flujo (se genera un cupón)

#### Verificaciones:
- [ ] Redirige a `payment-pending.html`
- [ ] Muestra instrucciones de pago (código de cupón)
- [ ] Webhook recibe notificación de `merchant_order`
- [ ] Pedido actualizado:
  - [ ] `estado = "en_espera"`
  - [ ] `estado_pago = "pendiente"`
- [ ] **Stock NO se descuenta** ⚠️ (crítico)
- [ ] Cuando el usuario pague en Rapipago:
  - [ ] Webhook recibe nueva notificación (payment approved)
  - [ ] Pedido actualiza a "pagado"
  - [ ] AHORA SÍ se descuenta stock

**Verificar en logs (merchant_order):**
```
📦 Merchant order recibida: 35126453205
✅ Merchant Order consultada exitosamente
💳 Payment en Merchant Order - ID: 1342060043, Status: pending
ℹ️ Payment con status 'pending' - no se procesa aún
```

**Verificar en logs (cuando se paga en Rapipago):**
```
📦 Merchant order recibida: 35126453205
💳 Payment en Merchant Order - ID: 1342060043, Status: approved
✅ Pago consultado exitosamente
Pedido actualizado: MUTA-XXX - Estado: pagado
Stock descontado...
```

---

### 3.4 Idempotencia (Notificaciones Duplicadas)

Este test verifica que el webhook NO descuenta stock 2 veces si MP reintenta la notificación.

#### Pasos:
1. Hacer un pago aprobado normalmente
2. Simular una notificación duplicada:
   ```bash
   curl -X POST "https://tu-url.ngrok-free.app/Muta/backend/mp-webhook.php?topic=payment&id=1342060043&type=payment&data_id=1342060043"
   ```
3. Repetir la simulación 3-5 veces

#### Verificaciones:
- [ ] Primera notificación: descuenta stock ✅
- [ ] Notificaciones 2-5: NO descontaron stock ✅
- [ ] Logs muestran:
  ```
  ⚠️ IDEMPOTENCIA: Payment ID 1342060043 ya fue procesado. Ignorando.
  ```
- [ ] MongoDB tiene el payment_id en `payments_procesados[]` una sola vez
- [ ] Stock se descontó solo 1 vez (no 5 veces)

**Verificar en MongoDB:**
```javascript
db.pedidos.findOne({numero_pedido: "MUTA-XXX"}).mercadopago.payments_procesados
// Debe mostrar: [1342060043]
// NO debe duplicarse aunque lleguen 5 notificaciones
```

**Verificar stock:**
```javascript
// Si compraste 2 unidades:
// Stock inicial: 10
// Stock después de 5 notificaciones: 8 (NO 0)
```

---

## 🔒 4. SEGURIDAD

### 4.1 Validación de Firma

- [ ] Clave secreta configurada (NO `TU_CLAVE_SECRETA_AQUI`)
- [ ] Logs NO muestran: "ADVERTENCIA: Clave secreta no configurada"
- [ ] Logs muestran: "✅ Firma del webhook validada correctamente"

#### Test de Firma Inválida:
Simular notificación con firma incorrecta:

```bash
curl -X POST \
  -H "x-signature: ts=123456,v1=FIRMA_FALSA" \
  -H "x-request-id: test-123" \
  "https://tu-url.ngrok-free.app/Muta/backend/mp-webhook.php?topic=payment&id=test123"
```

**Verificar:**
- [ ] Webhook rechaza la notificación (HTTP 401)
- [ ] Logs muestran: "❌ ALERTA: Firma del webhook inválida"
- [ ] Pedido NO se actualiza
- [ ] Stock NO se descuenta

### 4.2 Protección contra Ataques

- [ ] Notificaciones sin firma válida son rechazadas
- [ ] Solo notificaciones de Mercado Pago son procesadas
- [ ] No hay credenciales hardcodeadas en el código (usar `.env`)
- [ ] `.env` está en `.gitignore`
- [ ] Access Token NO está expuesto en frontend (solo Public Key)

---

## 📊 5. FLUJO COMPLETO END-TO-END

### Escenario: Usuario compra 2 remeras

#### Estado Inicial:
```javascript
// MongoDB - productos
{
  "_id": "abc123",
  "nombre": "Remera Básica",
  "stock": 10,
  "variantes": [
    {"talle": "M", "stock": 5},
    {"talle": "L", "stock": 5}
  ],
  "estado": "Activo",
  "publicable": true
}
```

#### Pasos del Usuario:
1. Agrega 2 remeras talle M al carrito
2. Procede al checkout
3. Paga con tarjeta de prueba aprobada

#### Verificaciones:

**A. Preferencia Creada:**
- [ ] `external_reference = "MUTA-20251030-ABC123"`
- [ ] `items[0].quantity = 2`
- [ ] `items[0].unit_price = 5000`
- [ ] `notification_url` configurada
- [ ] `back_urls` configuradas

**B. Pago Aprobado:**
- [ ] Usuario redirigido a `payment-success.html`
- [ ] Payment ID: `1342060043`
- [ ] Status: `approved`

**C. Webhook Procesó Notificación:**
- [ ] Recibió notificación `topic=payment, id=1342060043`
- [ ] Validó firma ✅
- [ ] Consultó pago en API de MP ✅
- [ ] Verificó idempotencia (payment_id no procesado previamente) ✅

**D. Pedido Actualizado:**
```javascript
db.pedidos.findOne({numero_pedido: "MUTA-20251030-ABC123"})
// Debe tener:
{
  "estado": "pagado",
  "estado_pago": "aprobado",
  "fecha_pago": ISODate("2025-10-30T15:30:00Z"),
  "mercadopago": {
    "payment_id": 1342060043,
    "status": "approved",
    "payments_procesados": [1342060043]
  }
}
```

**E. Stock Descontado:**
```javascript
db.products.findOne({_id: "abc123"})
// Debe tener:
{
  "nombre": "Remera Básica",
  "stock": 8,  // 10 - 2 = 8
  "variantes": [
    {"talle": "M", "stock": 3},  // 5 - 2 = 3
    {"talle": "L", "stock": 5}   // Sin cambios
  ],
  "estado": "Activo",  // Sigue activo porque stock > 5
  "publicable": true
}
```

**F. Logs:**
```bash
[2025-10-30 15:30:00] ✅ Firma del webhook validada correctamente
[2025-10-30 15:30:00] Procesando notificación - Topic: payment, ID: 1342060043
[2025-10-30 15:30:02] ✅ Pago 1342060043 consultado exitosamente
[2025-10-30 15:30:02] ✅ Payment ID 1342060043 es nuevo. Procesando...
[2025-10-30 15:30:02] Pedido actualizado: MUTA-20251030-ABC123 - Estado: pagado
[2025-10-30 15:30:02] Stock descontado - Producto: abc123, Talle: M, Stock anterior: 5, Stock nuevo: 3
[2025-10-30 15:30:02] ✅ Stock actualizado exitosamente
```

---

## 🚀 6. PRE-PRODUCCIÓN

### 6.1 Todas las Pruebas Pasaron
- [ ] Pago aprobado → ✅ Actualiza + Descuenta
- [ ] Pago rechazado → ✅ Actualiza + NO descuenta
- [ ] Pago pendiente → ✅ Actualiza + NO descuenta (hasta aprobación)
- [ ] Idempotencia → ✅ No duplica descuento
- [ ] Firma inválida → ✅ Rechaza (HTTP 401)
- [ ] Merchant Orders → ✅ Procesa correctamente

### 6.2 Seguridad
- [ ] Clave secreta configurada
- [ ] Credenciales en `.env` o archivo seguro
- [ ] `.env` en `.gitignore`
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Access Token NO expuesto en frontend

### 6.3 Logs y Monitoreo
- [ ] Logs se escriben correctamente
- [ ] Logs incluyen timestamps
- [ ] Logs incluyen payment_ids
- [ ] Logs incluyen errores HTTP
- [ ] Sistema de alertas configurado (opcional)

### 6.4 Documentación
- [ ] README completado
- [ ] `.env.example` creado
- [ ] Checklist de verificación completo (este documento)
- [ ] Equipo capacitado en troubleshooting

---

## 🎯 7. PRODUCCIÓN

### 7.1 Cambios para Producción
- [ ] Credenciales de producción obtenidas
- [ ] Access Token de producción configurado
- [ ] Public Key de producción configurado
- [ ] Webhook de producción configurado (URL con dominio real)
- [ ] Clave secreta de producción configurada
- [ ] `MP_SANDBOX_MODE = false` ⚠️
- [ ] BASE_URL apunta a dominio productivo (NO ngrok)

### 7.2 Prueba en Producción
- [ ] Pago real con monto mínimo (ej: $10)
- [ ] Webhook recibe notificación
- [ ] Pedido se actualiza
- [ ] Stock se descuenta
- [ ] Email de confirmación enviado
- [ ] Usuario recibe confirmación

### 7.3 Monitoreo Continuo
- [ ] Revisar logs diariamente: `tail -f backend/logs/mp-notifications.log`
- [ ] Verificar pagos aprobados sin notificación webhook
- [ ] Alertar sobre errores HTTP 404/401/500
- [ ] Verificar consistencia de stock semanalmente

---

## ✅ RESULTADO FINAL

### Porcentaje de Completitud

| Categoría | Completado | Total | % |
|-----------|-----------|-------|---|
| Configuración | ___ / 14 | 14 | __% |
| Webhook | ___ / 10 | 10 | __% |
| Pruebas Pago | ___ / 35 | 35 | __% |
| Seguridad | ___ / 9 | 9 | __% |
| Flujo E2E | ___ / 6 | 6 | __% |
| Pre-Producción | ___ / 13 | 13 | __% |
| Producción | ___ / 10 | 10 | __% |
| **TOTAL** | **___ / 97** | **97** | **___%** |

### Estado General

- **90-100%**: ✅ Listo para producción
- **75-89%**: ⚠️ Casi listo, revisar pendientes
- **60-74%**: ⚠️ Requiere mejoras antes de producción
- **< 60%**: ❌ NO listo para producción

---

## 📞 Contacto y Soporte

**Si algún item del checklist falla:**

1. Revisa los logs: `backend/logs/mp-notifications.log`
2. Ejecuta diagnóstico: `php backend/diagnostico-mp-api.php`
3. Consulta troubleshooting: `INTEGRAR_MERCADOPAGO_COMPLETO.md`
4. Revisa análisis técnico: `ANALISIS_INTEGRACION_MP.md`

---

**Elaborado por:** Claude Code
**Versión:** 1.0
**Última actualización:** 2025-10-30
