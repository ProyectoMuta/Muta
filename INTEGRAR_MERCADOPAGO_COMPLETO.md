# 🚀 Guía Completa: Integración Mercado Pago Checkout Pro

## 📋 Tabla de Contenidos
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación y Configuración](#instalación-y-configuración)
3. [Configurar Webhook en Mercado Pago](#configurar-webhook)
4. [Probar la Integración](#probar-la-integración)
5. [Tarjetas de Prueba](#tarjetas-de-prueba)
6. [Troubleshooting](#troubleshooting)
7. [Pasar a Producción](#pasar-a-producción)

---

## ✅ Requisitos Previos

- PHP 8.0 o superior
- MongoDB 4.0 o superior
- Composer instalado
- Cuenta de Mercado Pago (creada en https://www.mercadopago.com.ar)
- Ngrok instalado (para desarrollo local)

---

## 🛠️ Instalación y Configuración

### Paso 1: Instalar Dependencias con Composer

```bash
cd backend/
composer install
```

Esto instalará:
- `mercadopago/dx-php` (SDK oficial versión 3.0+)
- `mongodb/mongodb` (Driver de MongoDB)
- Otras dependencias

**Verificar instalación:**
```bash
ls -la backend/vendor/mercadopago/
```

Deberías ver el directorio `dx-php/`.

---

### Paso 2: Obtener Credenciales de Mercado Pago

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. Inicia sesión con tu cuenta
3. Ve a **Tus integraciones** → **Credenciales**
4. Selecciona **Credenciales de prueba** (para sandbox)
5. Copia:
   - **Access Token** (comienza con `APP_USR-` o `TEST-`)
   - **Public Key** (comienza con `APP_USR-` o `TEST-`)

📝 **IMPORTANTE:** Estas credenciales son diferentes para Pruebas (sandbox) y Producción.

---

### Paso 3: Configurar Credenciales

#### Opción A: Crear archivo `.env` (Recomendado)

```bash
# En la raíz del proyecto
cp .env.example .env
nano .env
```

Edita el archivo `.env` con tus credenciales:

```env
MP_ACCESS_TOKEN=APP_USR-3893971663823189-102814-xxxxxxxxxxxx
MP_PUBLIC_KEY=APP_USR-73f42220-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_WEBHOOK_SECRET=     # Dejar vacío por ahora, se configura después
MP_SANDBOX_MODE=true
BASE_URL=https://tu-subdominio.ngrok-free.app/Muta
```

#### Opción B: Editar directamente `backend/mp-config.php`

```bash
nano backend/mp-config.php
```

Reemplaza estas líneas:

```php
define('MP_ACCESS_TOKEN', 'APP_USR-TU_ACCESS_TOKEN_AQUI');
define('MP_PUBLIC_KEY', 'APP_USR-TU_PUBLIC_KEY_AQUI');
define('MP_WEBHOOK_SECRET', 'TU_CLAVE_SECRETA_AQUI'); // Por ahora déjalo así
```

---

### Paso 4: Configurar ngrok (Desarrollo Local)

Mercado Pago necesita enviar notificaciones a tu webhook via HTTPS. Ngrok crea un túnel público.

#### Instalar ngrok (si no lo tienes)

```bash
# Linux/Mac
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/

# Windows
# Descarga desde https://ngrok.com/download
```

#### Ejecutar ngrok

```bash
ngrok http 80
```

O si tu servidor corre en otro puerto:

```bash
ngrok http 8080
```

**Salida esperada:**
```
Session Status    online
Forwarding        https://abc123xyz.ngrok-free.app -> http://localhost:80
```

**🔑 Copia la URL HTTPS** (ejemplo: `https://abc123xyz.ngrok-free.app`)

#### Actualizar BASE_URL

Edita `backend/mp-config.php` o `.env`:

```php
// mp-config.php
define('BASE_URL', 'https://abc123xyz.ngrok-free.app/Muta');

// o en .env
BASE_URL=https://abc123xyz.ngrok-free.app/Muta
```

**⚠️ IMPORTANTE:** Cada vez que reinicies ngrok, la URL cambia. Debes actualizar:
1. `BASE_URL` en la configuración
2. La URL del webhook en el panel de Mercado Pago

---

## 🔔 Configurar Webhook

### Paso 1: Acceder al Panel de Webhooks

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. **Tus integraciones** → **Notificaciones** → **Webhooks**
3. Click en **Configurar notificaciones**

### Paso 2: Configurar el Webhook

**URL del Webhook:**
```
https://abc123xyz.ngrok-free.app/Muta/backend/mp-webhook.php
```

**Eventos a notificar:**
- ✅ **Pagos** (obligatorio)
- ✅ **Merchant Orders** (recomendado para medios offline)

**Modo:**
- Selecciona **Modo Producción** (sí, aunque uses credenciales de prueba)

### Paso 3: Guardar y Copiar la Clave Secreta

1. Click en **Guardar**
2. Mercado Pago te mostrará una **Clave Secreta** (Secret Key)
3. **⚠️ COPIA ESTA CLAVE INMEDIATAMENTE** (solo se muestra una vez)
4. Ejemplo: `fJ8K4mP9qR2sT5vX7yZ0aB3cD6eF9gH2`

### Paso 4: Configurar la Clave Secreta

Edita `backend/mp-config.php`:

```php
define('MP_WEBHOOK_SECRET', 'fJ8K4mP9qR2sT5vX7yZ0aB3cD6eF9gH2');
```

O en `.env`:

```env
MP_WEBHOOK_SECRET=fJ8K4mP9qR2sT5vX7yZ0aB3cD6eF9gH2
```

**🔒 ¿Para qué sirve?**
La clave secreta valida que las notificaciones realmente vienen de Mercado Pago y no son falsificadas.

---

## ✅ Verificar Configuración

### Script de Verificación Automática

Ejecuta el script de verificación:

```bash
php backend/verificar-webhook.php
```

O accede via navegador:
```
https://abc123xyz.ngrok-free.app/Muta/backend/verificar-webhook.php
```

**Debe mostrar:**
```
✅ Archivo mp-webhook.php existe
✅ Archivo es escribible
✅ Directorio logs/ existe
✅ Credenciales configuradas
✅ URL webhook accesible via HTTPS
```

### Diagnóstico de la API

```bash
php backend/diagnostico-mp-api.php
```

O via navegador:
```
https://abc123xyz.ngrok-free.app/Muta/backend/diagnostico-mp-api.php
```

**Debe mostrar:**
```json
{
  "conexion_api": {
    "conectado": true,
    "usuario_id": 2942643227,
    "email": "test_user_xxxx@testuser.com"
  }
}
```

---

## 🧪 Probar la Integración

### Prueba 1: Simular Notificación desde el Panel

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. **Tus integraciones** → **Notificaciones** → **Webhooks**
3. Click en **Simular notificación**
4. Elige **Pago aprobado**
5. Click en **Enviar**

**Verificar en logs:**

```bash
tail -f backend/logs/mp-notifications.log
```

Deberías ver:
```
[2025-10-30 12:00:00] ✅ Firma del webhook validada correctamente
[2025-10-30 12:00:00] Procesando notificación - Topic: payment, ID: 123456
```

---

### Prueba 2: Pago Real con Tarjetas de Prueba

#### 1. Crear un pedido en tu tienda

- Agrega productos al carrito
- Procede al checkout
- Elige "Pagar con Mercado Pago"

#### 2. Usar tarjeta de prueba

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---------|--------|-----|-------------|-----------|
| Mastercard | `5031 7557 3453 0604` | 123 | 11/25 | ✅ Aprobada |
| Visa | `4509 9535 6623 3704` | 123 | 11/25 | ✅ Aprobada |
| Visa | `4485 7412 4012 0015` | 123 | 11/25 | ❌ Rechazada |

**Documento:** `12345678` (cualquier número sirve en sandbox)

#### 3. Completar el pago

- Ingresa los datos de la tarjeta
- Click en **Pagar**
- Espera la confirmación

#### 4. Verificar en logs

```bash
tail -f backend/logs/mp-notifications.log
```

Deberías ver:
```
[2025-10-30 12:05:00] ✅ Firma del webhook validada correctamente
[2025-10-30 12:05:00] Procesando notificación - Topic: payment, ID: 1342060043
[2025-10-30 12:05:02] ✅ Pago 1342060043 consultado exitosamente
[2025-10-30 12:05:02] ✅ Payment ID 1342060043 es nuevo. Procesando...
[2025-10-30 12:05:02] Pedido actualizado: MUTA-123 - Estado: pagado
[2025-10-30 12:05:02] ✅ Stock descontado para producto ABC - Talle M
```

#### 5. Verificar en MongoDB

```bash
mongo
use mutaDB
db.pedidos.findOne({numero_pedido: "MUTA-123"})
```

Deberías ver:
```json
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

#### 6. Verificar Stock

```bash
db.products.findOne({_id: ObjectId("...")})
```

El stock debe haberse descontado.

---

## 📊 Checklist de Verificación

### Casos a Probar

- [ ] **Pago Aprobado** → Actualiza pedido ✅ + Descuenta stock ✅
- [ ] **Pago Pendiente** (Rapipago/PagoFácil) → Actualiza pedido ⏳ + NO descuenta stock ❌
- [ ] **Pago Rechazado** → Actualiza pedido ❌ + NO descuenta stock ❌
- [ ] **Notificación Duplicada** → Idempotencia (no descuenta 2 veces) ✅
- [ ] **Merchant Order** → Procesa pagos dentro de la orden ✅
- [ ] **Firma Inválida** → Rechaza notificación (HTTP 401) ✅

### Script de Prueba Automatizada

```bash
php backend/test-webhook.php
```

Este script simula notificaciones sin necesidad de hacer pagos reales.

---

## 🚨 Troubleshooting

### Problema 1: "Error 404 al consultar pago"

**Logs muestran:**
```
Error al consultar pago 1342060043: HTTP 404
```

**Causas posibles:**
1. **Timing**: MP notifica antes de que el pago esté indexado
   - ✅ **Solución:** El webhook ya implementa reintentos con delay de 2s
   - Espera unos segundos y debería resolverse automáticamente

2. **Access Token incorrecto**: El token no corresponde a la cuenta que creó la preferencia
   - ✅ **Solución:** Verifica que el Access Token en `mp-config.php` sea de la misma cuenta

3. **Pago de prueba expirado**: Los pagos sandbox se limpian automáticamente
   - ✅ **Solución:** Crea un pago nuevo

**Verificar:**
```bash
php backend/diagnostico-mp-api.php?payment_id=1342060043
```

---

### Problema 2: "Webhook no recibe notificaciones"

**Síntomas:**
- Logs vacíos
- Panel de MP muestra "0 notificaciones enviadas"

**Causas posibles:**
1. **Webhook URL incorrecta**
   - Verifica en el panel: https://www.mercadopago.com.ar/developers/panel
   - Debe ser HTTPS (ngrok provee esto)

2. **ngrok no está corriendo**
   ```bash
   ngrok http 80
   ```

3. **Firewall bloqueando**
   - Verifica que el puerto 80/443 esté abierto

**Verificar manualmente:**
```bash
curl -X POST https://tu-url.ngrok-free.app/Muta/backend/mp-webhook.php?topic=payment&id=test123
```

Deberías recibir:
```json
{"success":true}
```

---

### Problema 3: "ADVERTENCIA: Clave secreta no configurada"

**Logs muestran:**
```
ADVERTENCIA: Clave secreta del webhook no configurada. Saltando validación de firma.
```

**🔴 CRÍTICO - VULNERABILIDAD DE SEGURIDAD**

**Solución:**
1. Ve al panel de MP → Webhooks
2. Copia la clave secreta
3. Edita `backend/mp-config.php`:
   ```php
   define('MP_WEBHOOK_SECRET', 'tu_clave_secreta_aqui');
   ```

**Si perdiste la clave:**
1. Elimina el webhook actual
2. Crea uno nuevo
3. Copia la nueva clave secreta

---

### Problema 4: "Stock se descuenta 2 veces"

**Causa:**
Mercado Pago reintenta notificaciones si no recibe respuesta 200 a tiempo.

**Solución:**
✅ Ya implementado: El webhook usa idempotencia (`payments_procesados[]`).

**Verificar en MongoDB:**
```javascript
db.pedidos.findOne({numero_pedido: "MUTA-123"}).mercadopago.payments_procesados
// Debe mostrar: [1342060043]
// Aunque lleguen 10 notificaciones, solo se procesa 1 vez
```

---

### Problema 5: "Pagos con Rapipago/PagoFácil no actualizan"

**Causa:**
Medios offline notifican primero `merchant_order`, no `payment`.

**Solución:**
✅ Ya implementado: El webhook procesa `merchant_order`.

**Verificar en logs:**
```
📦 Merchant order recibida: 35126453205
✅ Merchant Order 35126453205 consultada exitosamente
💳 Payment en Merchant Order - ID: 1342060043, Status: approved
```

---

## 🚀 Pasar a Producción

### Checklist Pre-Producción

- [ ] Todas las pruebas en sandbox pasan
- [ ] Webhook funciona correctamente
- [ ] Stock se descuenta solo en pagos aprobados
- [ ] Idempotencia funciona (no duplica descuentos)
- [ ] Logs se escriben correctamente
- [ ] Credenciales en `.env` (no hardcodeadas)
- [ ] `.env` en `.gitignore`

### Pasos para Producción

#### 1. Obtener Credenciales de Producción

1. Ve a https://www.mercadopago.com.ar/developers/panel
2. **Tus integraciones** → **Credenciales**
3. Selecciona **Credenciales de producción**
4. Completa el formulario de activación (si es la primera vez)
5. Copia las nuevas credenciales:
   - Access Token (comienza con `APP-`)
   - Public Key (comienza con `APP-`)

#### 2. Configurar Dominio Productivo

En producción NO uses ngrok. Usa tu dominio real:

```php
// backend/mp-config.php
define('MP_SANDBOX_MODE', false); // ⚠️ IMPORTANTE
define('BASE_URL', 'https://www.tudominio.com');
```

#### 3. Configurar Webhook de Producción

1. Ve al panel de MP
2. Crea un nuevo webhook
3. URL: `https://www.tudominio.com/backend/mp-webhook.php`
4. Eventos: **Pagos** + **Merchant Orders**
5. **Modo:** Producción
6. Guarda y copia la nueva clave secreta

#### 4. Actualizar Credenciales

Edita `.env` o `mp-config.php`:

```php
define('MP_ACCESS_TOKEN', 'APP-tu_access_token_produccion');
define('MP_PUBLIC_KEY', 'APP-tu_public_key_produccion');
define('MP_WEBHOOK_SECRET', 'nueva_clave_secreta_produccion');
define('MP_SANDBOX_MODE', false); // ⚠️ NO OLVIDAR
```

#### 5. Probar en Producción

**⚠️ IMPORTANTE:** Usa tarjetas REALES en producción. Se cobrarán de verdad.

1. Haz un pago de prueba con monto mínimo (ej: $10)
2. Verifica que:
   - Webhook recibe notificación
   - Pedido se actualiza
   - Stock se descuenta
   - Email de confirmación se envía (si aplica)

#### 6. Monitorear

```bash
tail -f backend/logs/mp-notifications.log
```

---

## 📁 Estructura de Archivos

```
Muta/
├── backend/
│   ├── mp-config.php              # Configuración de credenciales
│   ├── mp-webhook.php             # Webhook handler
│   ├── pagosController.php        # Creación de preferencias
│   ├── diagnostico-mp-api.php     # Script de diagnóstico
│   ├── test-webhook.php           # Simular notificaciones
│   ├── verificar-webhook.php      # Verificar configuración
│   ├── composer.json              # Dependencias
│   ├── vendor/                    # SDK de Mercado Pago
│   └── logs/
│       └── mp-notifications.log   # Logs del webhook
├── .env                           # Variables de entorno (NO subir a Git)
├── .env.example                   # Plantilla de variables
└── INTEGRAR_MERCADOPAGO_COMPLETO.md  # Esta guía
```

---

## 📚 Documentación Adicional

- **Docs Oficiales MP:** https://www.mercadopago.com.ar/developers/es/docs
- **SDK PHP:** https://github.com/mercadopago/sdk-php
- **Panel de Desarrolladores:** https://www.mercadopago.com.ar/developers/panel
- **Tarjetas de Prueba:** https://www.mercadopago.com.ar/developers/es/docs/test-cards

---

## 💬 Soporte

Si tienes problemas:

1. Revisa los logs: `backend/logs/mp-notifications.log`
2. Ejecuta el diagnóstico: `php backend/diagnostico-mp-api.php`
3. Consulta la sección [Troubleshooting](#troubleshooting)
4. Revisa el análisis: `ANALISIS_INTEGRACION_MP.md`

---

**Última actualización:** 2025-10-30
**Versión:** 2.0 (con idempotencia y merchant_orders)
