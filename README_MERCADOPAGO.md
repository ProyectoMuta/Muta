# 💳 Integración de Mercado Pago - MUTA

Documentación completa para la implementación de pagos con Mercado Pago en el e-commerce MUTA.

---

## 📋 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Requisitos Previos](#-requisitos-previos)
3. [Instalación del SDK](#-instalación-del-sdk)
4. [Configuración de Credenciales](#-configuración-de-credenciales)
5. [Estructura de Archivos](#-estructura-de-archivos)
6. [Flujo de Pago](#-flujo-de-pago)
7. [Cuentas de Prueba](#-cuentas-de-prueba)
8. [Tarjetas de Prueba](#-tarjetas-de-prueba)
9. [Testing y Debugging](#-testing-y-debugging)
10. [Webhooks y Notificaciones](#-webhooks-y-notificaciones)
11. [Pasar a Producción](#-pasar-a-producción)
12. [Solución de Problemas](#-solución-de-problemas)

---

## 🎯 Descripción General

Esta integración implementa el **Checkout API** de Mercado Pago, que permite a los usuarios:

- Pagar con tarjetas de crédito/débito
- Usar dinero en cuenta de Mercado Pago
- Pagar en efectivo (Rapipago, Pago Fácil)
- Transferencia bancaria
- Y todos los medios de pago disponibles en Argentina

### Características Implementadas

✅ **Checkout API completo** con redirección a Mercado Pago
✅ **Webhooks** para actualización automática de estados
✅ **Páginas de respuesta** (éxito, error, pendiente)
✅ **Integración con sistema de pedidos** existente
✅ **Modo sandbox/producción** configurable
✅ **Logs de notificaciones** para debugging

---

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- ✅ PHP 7.4 o superior
- ✅ Composer instalado ([descargar aquí](https://getcomposer.org/download/))
- ✅ MongoDB instalado y corriendo
- ✅ MySQL instalado y corriendo
- ✅ Una cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)

---

## 📦 Instalación del SDK

### Paso 1: Instalar Dependencias

Desde el directorio **backend/** del proyecto, ejecuta:

```bash
cd backend
composer install
```

O si ya tienes composer instalado pero no las dependencias:

```bash
cd backend
composer update
```

Esto instalará automáticamente:
- `mercadopago/dx-php` v3.0+ (SDK oficial de Mercado Pago)
- MongoDB PHP Library
- PHPMailer
- Google API Client

### Paso 2: Verificar Instalación

Verifica que el SDK se instaló correctamente:

```bash
ls -la backend/vendor/mercadopago/
```

Deberías ver la carpeta `dx-php` con todos los archivos del SDK.

### Paso 3: Verificar Autoload

El archivo `vendor/autoload.php` debe existir en `backend/vendor/autoload.php`. Este es necesario para cargar el SDK.

---

## 🔑 Configuración de Credenciales

### 1. Obtener Credenciales de Mercado Pago

#### a) Crear Cuenta de Desarrollador

1. Ve a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Inicia sesión con tu cuenta de Mercado Pago (o crea una)
3. Ve a **"Panel de Desarrolladores"**

#### b) Crear Aplicación

1. En el panel, ve a **"Tus integraciones"**
2. Click en **"Crear aplicación"**
3. Completa los datos:
   - **Nombre**: MUTA Tienda Online
   - **Modelo de integración**: Checkout API
   - **Producto**: Pagos online
4. Guarda la aplicación

#### c) Obtener Credenciales de Prueba

1. Ve a **"Credenciales"** en el menú lateral
2. Selecciona **"Credenciales de prueba"**
3. Copia:
   - **Access Token** (TEST-...)
   - **Public Key** (TEST-...)

### 2. Configurar el Archivo `mp-config.php`

Abre el archivo `backend/mp-config.php` y reemplaza las credenciales:

```php
// Credenciales de PRUEBA (Sandbox)
define('MP_ACCESS_TOKEN', 'TEST-1234567890123456-010100-abcdef1234567890abcdef1234567890-123456789');
define('MP_PUBLIC_KEY', 'TEST-abcd1234-ef56-78ab-cdef-123456789abc');
```

### 3. Configurar URLs de Redirección

En el mismo archivo, ajusta la URL base según tu entorno:

```php
// En desarrollo local
define('BASE_URL', 'http://localhost/Muta');

// En producción (cuando subas a un servidor)
// define('BASE_URL', 'https://tudominio.com');
```

### 4. Verificar Configuración

Prueba que las credenciales están correctas accediendo a:

```
http://localhost/Muta/backend/pagosController.php?action=test_config
```

Deberías ver una respuesta JSON como:

```json
{
  "success": true,
  "mensaje": "Configuración de Mercado Pago correcta",
  "data": {
    "sandbox_mode": true,
    "public_key": "TEST-abcd...",
    "access_token_configurado": true
  }
}
```

---

## 📁 Estructura de Archivos

### Archivos Nuevos Creados

```
Muta/
├── backend/
│   ├── mp-config.php              # ⭐ Configuración de credenciales
│   ├── pagosController.php        # ⭐ Controlador principal de pagos
│   ├── mp-webhook.php             # ⭐ Receptor de notificaciones de MP
│   ├── composer.json              # ✏️ Incluye SDK de Mercado Pago
│   ├── vendor/                    # Dependencias de Composer
│   │   └── mercadopago/           # SDK de Mercado Pago
│   └── logs/
│       └── mp-notifications.log   # ⭐ Log de webhooks (se crea automáticamente)
├── payment-success.html           # ⭐ Página de pago exitoso
├── payment-failure.html           # ⭐ Página de pago rechazado
├── payment-pending.html           # ⭐ Página de pago pendiente
└── README_MERCADOPAGO.md          # ⭐ Esta documentación
```

### Archivos Modificados

```
Muta/
├── backend/
│   └── composer.json              # ✏️ Agregado SDK de Mercado Pago
└── js/carritoJS/
    └── checkout.js                # ✏️ Integración con flujo de pago
```

---

## 🔄 Flujo de Pago

### Flujo Completo (Usuario)

```
1. Usuario agrega productos al carrito
   └─> cart.html

2. Usuario hace click en "Finalizar compra"
   └─> Se abre modal de selección de envío

3. Usuario selecciona método de envío
   └─> Se abre modal de selección de pago

4. Usuario selecciona "Pagar con Mercado Pago"
   └─> Click en botón "Pagar con Mercado Pago"

5. BACKEND: Se crea el pedido en MongoDB
   └─> Estado: "en_espera"
   └─> Estado pago: "pendiente"

6. BACKEND: Se crea preferencia de pago en Mercado Pago
   └─> Se guarda preferencia_id en el pedido

7. REDIRECCIÓN: Usuario es redirigido a Mercado Pago
   └─> URL: sandbox.mercadopago.com.ar/checkout/...

8. Usuario completa el pago en Mercado Pago
   └─> Ingresa datos de tarjeta/método de pago

9. Mercado Pago procesa el pago
   ├─> ✅ APROBADO → Redirige a payment-success.html
   ├─> ❌ RECHAZADO → Redirige a payment-failure.html
   └─> ⏳ PENDIENTE → Redirige a payment-pending.html

10. WEBHOOK: Mercado Pago notifica el resultado
    └─> POST a backend/mp-webhook.php

11. BACKEND: Se actualiza el estado del pedido
    ├─> Si aprobado: estado = "pagado"
    ├─> Si rechazado: estado = "cancelado"
    └─> Si pendiente: estado = "en_espera"

12. (Opcional) Se envía email de confirmación
```

### Flujo Técnico (Backend)

```javascript
// checkout.js (línea 475+)

1. finalizarCompra()
   ↓
2. Validar datos del usuario
   ↓
3. Obtener dirección de envío
   ↓
4. Crear pedido en MongoDB
   ↓
5. ¿Método de pago = "mercadopago"?
   │
   ├─> SÍ
   │   ↓
   │   6. Preparar datos para MP
   │   ↓
   │   7. POST a pagosController.php?action=crear_preferencia
   │   ↓
   │   8. Recibir init_point
   │   ↓
   │   9. Limpiar carrito
   │   ↓
   │   10. Redirigir a Mercado Pago
   │
   └─> NO (tarjeta u otro)
       ↓
       6. Enviar email de confirmación
       ↓
       7. Redirigir a index.html
```

---

## 👥 Cuentas de Prueba

Para probar en modo sandbox, Mercado Pago proporciona **cuentas de prueba** que simulan compradores y vendedores reales.

### Crear Cuentas de Prueba

1. Ve a [https://www.mercadopago.com.ar/developers/panel/test-users](https://www.mercadopago.com.ar/developers/panel/test-users)
2. Click en **"Crear usuario de prueba"**
3. Selecciona:
   - **País**: Argentina
   - **Cantidad de dinero**: 100000 (o lo que quieras)

Mercado Pago te dará:

```
Usuario: TEST1234567890
Contraseña: qatest1234
Email: test_user_123456@testuser.com
```

### Tipos de Usuarios de Prueba

- **Vendedor (seller)**: Recibe los pagos (tu cuenta de la tienda)
- **Comprador (buyer)**: Realiza las compras (usuario final)

**IMPORTANTE**: Usa la cuenta de **comprador** para probar pagos, ya que no puedes pagarte a ti mismo.

---

## 💳 Tarjetas de Prueba

Usa estas tarjetas para probar diferentes escenarios de pago en modo sandbox:

### ✅ Tarjetas Aprobadas

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| **Visa** | 4509 9535 6623 3704 | 123 | 11/25 | Aprobado |
| **Mastercard** | 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| **American Express** | 3711 803032 57522 | 1234 | 11/25 | Aprobado |

### ❌ Tarjetas con Fondos Insuficientes

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| **Mastercard** | 5031 4332 1540 6351 | 123 | 11/25 | Rechazado (fondos insuficientes) |

### ⚠️ Tarjetas que Requieren Autorización

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| **Visa** | 4509 9535 6623 3704 | 123 | 11/25 | Requiere autorización |

### 🔄 Tarjetas Pendientes

| Tarjeta | Número | CVV | Fecha | Resultado |
|---------|--------|-----|-------|-----------|
| **Visa Débito** | 4002 7686 4680 6632 | 123 | 11/25 | Pendiente |

### Datos de Titular para Todas las Tarjetas

```
Nombre: APRO (para aprobadas) / OTHE (para otros casos)
DNI: 12345678
Email: test_user_123456@testuser.com
```

### Más Tarjetas de Prueba

Lista completa oficial: [https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)

---

## 🧪 Testing y Debugging

### 1. Probar el Flujo Completo

#### a) Preparación
```bash
# Asegúrate de que los servicios estén corriendo
# MongoDB
sudo systemctl start mongod

# MySQL
sudo systemctl start mysql

# Apache/Nginx
sudo systemctl start apache2
```

#### b) Probar Creación de Pedido
1. Agrega productos al carrito
2. Ve al checkout
3. Completa los datos de envío
4. Selecciona "Pagar con Mercado Pago"
5. Verifica en la consola del navegador (F12) que se cree el pedido

#### c) Probar Preferencia de Mercado Pago
1. Después de crear el pedido, verifica que se redirija a Mercado Pago
2. La URL debe ser: `sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=...`

#### d) Probar Pago
1. Usa una tarjeta de prueba (ver sección anterior)
2. Completa el pago en Mercado Pago
3. Verifica que te redirija a `payment-success.html`

#### e) Verificar Webhook
1. Abre el archivo de log: `backend/logs/mp-notifications.log`
2. Verifica que haya una entrada con el payment_id
3. Verifica en MongoDB que el pedido se actualizó a estado "pagado"

### 2. Debugging con Logs

#### Ver Logs de Webhooks
```bash
tail -f backend/logs/mp-notifications.log
```

#### Ver Logs de PHP
```bash
tail -f /var/log/apache2/error.log
```

### 3. Probar Endpoints Manualmente

#### Crear Preferencia (con Postman/cURL)
```bash
curl -X POST http://localhost/Muta/backend/pagosController.php?action=crear_preferencia \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "id": "prod_001",
      "nombre": "Remera de Prueba",
      "cantidad": 1,
      "precio_unitario": 15000,
      "talle": "M",
      "color": "Azul"
    }],
    "payer": {
      "nombre": "Juan Test",
      "email": "test@test.com",
      "telefono": "+54 261 1234567"
    },
    "pedido_id": "507f1f77bcf86cd799439011",
    "numero_pedido": "MUTA-2025-00001"
  }'
```

#### Verificar Configuración
```bash
curl http://localhost/Muta/backend/pagosController.php?action=test_config
```

### 4. Consultar Estado de Pedidos en MongoDB

```bash
mongosh

use mutaDB

# Ver todos los pedidos
db.pedidos.find().pretty()

# Ver pedidos con Mercado Pago
db.pedidos.find({ "mercadopago": { $exists: true } }).pretty()

# Ver último pedido
db.pedidos.find().sort({ creado_en: -1 }).limit(1).pretty()
```

---

## 🔔 Webhooks y Notificaciones

### ¿Qué son los Webhooks?

Los webhooks son notificaciones automáticas que Mercado Pago envía a tu servidor cuando ocurre un evento (pago aprobado, rechazado, etc.).

### Configuración de Webhooks

#### En Desarrollo Local (con ngrok)

Como Mercado Pago necesita una URL pública para enviar webhooks, en desarrollo local necesitas usar **ngrok**:

1. **Instalar ngrok**
   ```bash
   # Descargar desde https://ngrok.com/download
   # O instalar con:
   snap install ngrok
   ```

2. **Ejecutar ngrok**
   ```bash
   ngrok http 80
   ```

3. **Copiar URL pública**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:80
   ```

4. **Actualizar mp-config.php**
   ```php
   define('BASE_URL', 'https://abc123.ngrok.io/Muta');
   define('MP_NOTIFICATION_URL', BASE_URL . '/backend/mp-webhook.php');
   ```

5. **Configurar en Mercado Pago**
   - Ve a tu aplicación en el panel de Mercado Pago
   - En "Webhooks", agrega la URL: `https://abc123.ngrok.io/Muta/backend/mp-webhook.php`

#### En Producción

1. **Actualizar mp-config.php**
   ```php
   define('BASE_URL', 'https://tudominio.com');
   ```

2. **Configurar en Mercado Pago**
   - URL de webhook: `https://tudominio.com/backend/mp-webhook.php`

### Estructura del Webhook

El archivo `mp-webhook.php` hace lo siguiente:

1. ✅ Recibe notificación de Mercado Pago
2. ✅ Registra en log (`backend/logs/mp-notifications.log`)
3. ✅ Consulta el pago en la API de MP
4. ✅ Actualiza el estado del pedido en MongoDB
5. ✅ Envía email de confirmación (si está aprobado)

### Verificar que Funciona

```bash
# Ver últimas notificaciones
tail -n 50 backend/logs/mp-notifications.log
```

Ejemplo de log correcto:
```
[2025-01-15 10:30:45] Webhook recibido - GET: {"topic":"payment","id":"123456789"} | POST: {}
[2025-01-15 10:30:46] Procesando notificación - Topic: payment, ID: 123456789
[2025-01-15 10:30:47] Pedido actualizado: MUTA-2025-00001 - Estado: pagado - Payment ID: 123456789
```

---

## 🚀 Pasar a Producción

### ⚠️ IMPORTANTE: Lista de Verificación

Antes de pasar a producción, asegúrate de:

- [ ] Tener cuenta de Mercado Pago **verificada** (con email y teléfono confirmados)
- [ ] Haber completado toda la información de tu cuenta
- [ ] Tener las **credenciales de producción** (no las de prueba)
- [ ] Haber probado exhaustivamente en modo sandbox
- [ ] Tener un servidor con HTTPS (certificado SSL)
- [ ] Haber configurado los webhooks en producción

### Paso 1: Obtener Credenciales de Producción

1. Ve al panel de Mercado Pago
2. En "Credenciales", selecciona **"Credenciales de producción"**
3. Copia:
   - **Access Token** (APP-...)
   - **Public Key** (APP-...)

### Paso 2: Actualizar Configuración

Edita `backend/mp-config.php`:

```php
// Credenciales de PRODUCCIÓN
define('MP_ACCESS_TOKEN', 'APP-1234567890123456-010100-abcdef1234567890abcdef1234567890-123456789');
define('MP_PUBLIC_KEY', 'APP-abcd1234-ef56-78ab-cdef-123456789abc');

// Cambiar a modo producción
define('MP_SANDBOX_MODE', false);

// URL de producción
define('BASE_URL', 'https://tudominio.com');
```

### Paso 3: Configurar Webhooks en Producción

1. En el panel de Mercado Pago, ve a "Webhooks"
2. Agrega la URL: `https://tudominio.com/backend/mp-webhook.php`
3. Selecciona eventos:
   - ✅ Pagos
   - ✅ Merchant orders (opcional)

### Paso 4: Verificar Certificado SSL

Tu servidor DEBE tener HTTPS. Verifica:

```bash
curl -I https://tudominio.com
```

Debe responder con `200 OK` sin errores de certificado.

### Paso 5: Hacer Prueba Real

⚠️ **IMPORTANTE**: La primera prueba en producción usará dinero real.

1. Haz una compra pequeña de prueba
2. Usa tu propia tarjeta o cuenta de Mercado Pago
3. Verifica que:
   - Se cree el pedido
   - Se redirija a MP
   - Se procese el pago
   - Se actualice el estado
   - Se envíe el email

### Paso 6: Monitorear

Después de lanzar:

- Revisa los logs diariamente: `backend/logs/mp-notifications.log`
- Verifica que los webhooks lleguen correctamente
- Monitorea pedidos "en_espera" que no se actualizan

---

## 🛠️ Solución de Problemas

### Error: "Las credenciales de Mercado Pago no están configuradas"

**Causa**: No actualizaste `mp-config.php` con tus credenciales reales.

**Solución**:
1. Abre `backend/mp-config.php`
2. Reemplaza `TEST-TU_ACCESS_TOKEN_AQUI` con tu token real
3. Reemplaza `TEST-TU_PUBLIC_KEY_AQUI` con tu public key real

---

### Error: "No hay conexión a MongoDB"

**Causa**: MongoDB no está corriendo o no está configurado en `config.php`.

**Solución**:
```bash
# Iniciar MongoDB
sudo systemctl start mongod

# Verificar que esté corriendo
sudo systemctl status mongod

# Verificar conexión en PHP
mongosh
```

---

### Error: "Class 'MercadoPago\MercadoPagoConfig' not found"

**Causa**: El SDK de Mercado Pago no está instalado.

**Solución**:
```bash
# Ir al directorio backend
cd backend

# Instalar dependencias
composer install

# O actualizar
composer update mercadopago/dx-php
```

---

### No se redirige a Mercado Pago

**Causa**: Puede ser un error en la creación de la preferencia.

**Solución**:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Busca la petición a `pagosController.php?action=crear_preferencia`
4. Revisa la respuesta JSON para ver el error

---

### El webhook no se ejecuta

**Causa**: Mercado Pago no puede llegar a tu servidor.

**Solución**:

**En desarrollo local**:
1. Usa ngrok: `ngrok http 80`
2. Actualiza la URL en `mp-config.php` con la URL de ngrok
3. Configura la URL de webhook en Mercado Pago

**En producción**:
1. Verifica que tu servidor sea accesible públicamente
2. Verifica que tengas HTTPS
3. Verifica los logs de Apache/Nginx:
   ```bash
   tail -f /var/log/apache2/access.log
   ```

---

### El pedido no se actualiza después del pago

**Causa**: El webhook no se está ejecutando o hay un error en `mp-webhook.php`.

**Solución**:
1. Revisa el log de webhooks:
   ```bash
   tail -f backend/logs/mp-notifications.log
   ```
2. Si no hay entradas, el webhook no está llegando (ver problema anterior)
3. Si hay entradas con errores, revisa el error específico
4. Verifica la conexión a MongoDB

---

### Error: "curl: command not found" en el webhook

**Causa**: Tu servidor no tiene curl instalado.

**Solución**:
```bash
sudo apt-get install curl php-curl
sudo systemctl restart apache2
```

---

## 📞 Soporte y Recursos

### Documentación Oficial de Mercado Pago

- [Guía de inicio](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/landing)
- [Checkout API](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-configuration)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks)
- [Tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/testing)

### SDK de PHP

- [GitHub del SDK](https://github.com/mercadopago/sdk-php)
- [Documentación del SDK](https://github.com/mercadopago/sdk-php/tree/master/doc)

### Contacto de Mercado Pago

- Panel de desarrolladores: [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
- Soporte: [https://www.mercadopago.com.ar/developers/es/support](https://www.mercadopago.com.ar/developers/es/support)

---

## 📝 Notas Adicionales

### Seguridad

- ⚠️ **NUNCA** subas `mp-config.php` a GitHub con credenciales reales
- ⚠️ Agrega `mp-config.php` a `.gitignore`
- ✅ Usa variables de entorno para credenciales en producción
- ✅ Mantén el SDK actualizado: `cd backend && composer update`

### Performance

- Los webhooks pueden tardar hasta 30 segundos en llegar
- Los pagos con transferencia pueden tardar hasta 3 días hábiles
- Los pagos con efectivo se confirman cuando el cliente paga en el punto de pago

### Costos

- Mercado Pago cobra una comisión por cada transacción
- En Argentina (2025): ~3.99% + $5 ARS por transacción
- Verifica las tarifas actuales en: [https://www.mercadopago.com.ar/costs-section/](https://www.mercadopago.com.ar/costs-section/)

---

## ✅ Checklist Final

Antes de considerar la integración completa, verifica:

### Backend
- [ ] SDK instalado (`vendor/mercadopago/dx-php` existe)
- [ ] Credenciales configuradas en `mp-config.php`
- [ ] Endpoint `crear_preferencia` funciona
- [ ] Endpoint `test_config` responde OK
- [ ] Webhook responde 200 OK

### Frontend
- [ ] Botón "Pagar con Mercado Pago" aparece
- [ ] Click en el botón crea preferencia
- [ ] Se redirecciona a Mercado Pago
- [ ] Páginas de respuesta funcionan (success/failure/pending)

### Base de Datos
- [ ] Los pedidos se crean en MongoDB
- [ ] El campo `mercadopago.preferencia_id` se guarda
- [ ] El estado se actualiza después del webhook
- [ ] El historial se registra correctamente

### Testing
- [ ] Probado con tarjeta aprobada
- [ ] Probado con tarjeta rechazada
- [ ] Probado con pago pendiente
- [ ] Webhook actualiza el estado correctamente
- [ ] Logs de notificaciones funcionan

### Producción
- [ ] Credenciales de producción configuradas
- [ ] Modo sandbox desactivado (`MP_SANDBOX_MODE = false`)
- [ ] URL de producción configurada
- [ ] Webhooks configurados en MP
- [ ] HTTPS funcionando
- [ ] Prueba real realizada

---

## 🎉 ¡Listo!

Si completaste todos los pasos, tu integración con Mercado Pago está lista para recibir pagos.

Para cualquier duda o problema, revisa la sección de [Solución de Problemas](#-solución-de-problemas) o contacta con el equipo de desarrollo.

---

**Documentación creada para el proyecto MUTA**
**Fecha**: Enero 2025
**Versión**: 1.0
**Autor**: Claude AI Assistant
