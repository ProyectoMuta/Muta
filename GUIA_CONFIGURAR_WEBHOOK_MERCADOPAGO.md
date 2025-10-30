# 🔔 Guía Paso a Paso: Configurar Webhooks en Mercado Pago

Esta guía te ayudará a configurar los webhooks en el panel de desarrolladores de Mercado Pago para que tu aplicación reciba notificaciones automáticas cuando se apruebe un pago.

---

## 📋 ¿Qué necesitas?

- ✅ Cuenta de desarrollador en Mercado Pago
- ✅ Una aplicación creada en el panel de desarrolladores
- ✅ La URL de tu webhook (la tienes más abajo)

---

## 🌐 Tu URL del Webhook

Esta es la URL que vas a configurar en Mercado Pago:

```
https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php
```

⚠️ **IMPORTANTE**: Esta URL debe ser:
- Accesible públicamente desde Internet
- Con protocolo HTTPS (requerido por Mercado Pago)
- Sin autenticación ni restricciones de acceso

---

## 📝 Paso 1: Acceder al Panel de Desarrolladores

1. Ve a: **https://www.mercadopago.com.ar/developers/panel**

2. Inicia sesión con tu cuenta de Mercado Pago

3. Verás el panel principal de desarrolladores

---

## 📝 Paso 2: Seleccionar o Crear tu Aplicación

### Opción A: Si ya tienes una aplicación creada

1. En el panel, verás una lista de tus aplicaciones
2. Haz clic en el nombre de tu aplicación (ejemplo: "Muta", "Mi Tienda", etc.)

### Opción B: Si NO tienes una aplicación

1. Haz clic en **"Crear aplicación"** o **"Nueva aplicación"**
2. Completa los datos:
   - **Nombre**: `Muta` (o el nombre que prefieras)
   - **Tipo**: Selecciona `Pagos online y presenciales`
   - **Producto**: Selecciona `Checkout Pro`
3. Haz clic en **"Crear aplicación"**

---

## 📝 Paso 3: Ir a la Sección de Webhooks

Una vez dentro de tu aplicación:

1. En el menú lateral izquierdo, busca la opción **"Webhooks"** o **"Notificaciones"**

   Puede estar dentro de:
   - **"Webhooks"** (opción directa)
   - **"Credenciales"** → **"Webhooks"**
   - **"Configuración"** → **"Webhooks"**

2. Haz clic en esa opción

---

## 📝 Paso 4: Configurar el Webhook

Ahora verás la pantalla de configuración de webhooks:

### 4.1 - Modo de Prueba (Sandbox)

Primero vamos a configurarlo en modo de prueba:

1. **Asegúrate de estar en "Credenciales de prueba"** o **"Modo Sandbox"**
   - Busca un toggle/switch que diga "Producción" / "Pruebas"
   - Selecciona **"Pruebas"**

2. **Haz clic en "Configurar Webhooks"** o **"Nueva URL"**

3. Te aparecerá un formulario. Completa:

   **URL de Notificaciones:**
   ```
   https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php
   ```

4. **Eventos a suscribir:**
   - ✅ Marca la casilla **"Pagos"** o **"payment"**
   - También puede aparecer como **"Notifications"** o **"IPN"**

   **Eventos específicos que debes marcar:**
   - ✅ `payment.created` (Pago creado)
   - ✅ `payment.updated` (Pago actualizado)

   O simplemente:
   - ✅ `payment` (incluye todos los eventos de pago)

5. **Haz clic en "Guardar"** o **"Crear"**

---

## 📝 Paso 5: Verificar que se Guardó Correctamente

Después de guardar, deberías ver:

- ✅ Tu URL del webhook listada
- ✅ Estado: **"Activo"** o **"Habilitado"**
- ✅ Eventos: **"payment"** o **"Pagos"**

---

## 🧪 Paso 6: Probar el Webhook

### Opción 1: Desde el Panel de Mercado Pago

Algunos paneles tienen una opción para enviar una notificación de prueba:

1. Busca un botón que diga **"Probar"** o **"Enviar prueba"**
2. Haz clic en él
3. Mercado Pago enviará una notificación de prueba a tu webhook

### Opción 2: Realizar un Pago de Prueba

1. Ve a tu aplicación web
2. Crea un pedido
3. Paga usando una **tarjeta de prueba**:

   **Para Pago Aprobado:**
   ```
   Número de tarjeta: 5031 7557 3453 0604
   Nombre: APRO
   CVV: 123
   Vencimiento: Cualquier fecha futura (ej: 12/26)
   ```

4. Completa el pago
5. Mercado Pago enviará la notificación a tu webhook

---

## 🔍 Paso 7: Verificar que Funciona

### Ver el Log del Webhook

Abre tu terminal y ejecuta:

```bash
tail -f backend/logs/mp-notifications.log
```

Deberías ver algo como:

```
[2025-01-30 15:30:15] Webhook recibido - GET: {"topic":"payment","id":"1234567890"} | POST: {}
[2025-01-30 15:30:16] Procesando notificación - Topic: payment, ID: 1234567890
[2025-01-30 15:30:17] Pedido actualizado: MUTA-2025-00001 - Estado: pagado - Payment ID: 1234567890
[2025-01-30 15:30:17] Stock actualizado - Producto: 67890abc, Talle: M, Stock anterior: 10, Stock nuevo: 9
```

### Ver las Notificaciones en el Panel de MP

1. En el panel de Mercado Pago, ve a **"Webhooks"**
2. Busca una sección que diga **"Historial"** o **"Notificaciones enviadas"**
3. Deberías ver las notificaciones enviadas a tu webhook con:
   - ✅ Fecha y hora
   - ✅ Código de respuesta: **200** (exitoso)
   - ✅ Evento: **payment**

---

## ⚠️ Solución de Problemas Comunes

### Problema 1: "URL inválida" al guardar

**Causa**: La URL no es accesible o no usa HTTPS

**Solución**:
```bash
# Verifica que la URL sea accesible
curl https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php

# Deberías recibir una respuesta (aunque sea un error, lo importante es que responda)
```

Si estás usando **ngrok**, asegúrate de que:
- El túnel esté activo
- La URL sea la correcta (ngrok cambia la URL cada vez que lo reinicias)

---

### Problema 2: Las notificaciones no llegan

**Verificaciones**:

1. **¿El webhook está activo en el panel?**
   - Ve a Webhooks en el panel
   - Verifica que el estado sea "Activo"

2. **¿La URL es correcta?**
   - Verifica que la URL en el panel sea exactamente:
     ```
     https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php
     ```

3. **¿Hay permisos de escritura en la carpeta logs?**
   ```bash
   # Crear carpeta si no existe
   mkdir -p backend/logs

   # Dar permisos
   chmod 777 backend/logs
   ```

4. **¿El webhook responde correctamente?**
   ```bash
   # Probar manualmente
   curl -X POST "https://bethany-unpouched-explicitly.ngrok-free.dev/Muta/backend/mp-webhook.php?topic=payment&id=123456"
   ```

---

### Problema 3: Notificaciones duplicadas

**Causa**: Mercado Pago reintenta enviar la notificación si no recibe respuesta 200

**Solución**: El webhook ya está configurado para responder inmediatamente con código 200. Verifica que no haya errores en el log.

---

## 🚀 Paso 8: Configurar para Producción

Cuando estés listo para pasar a producción:

1. **En el panel de Mercado Pago**:
   - Cambia de **"Credenciales de prueba"** a **"Credenciales de producción"**
   - Configura el mismo webhook pero con las credenciales de producción

2. **En tu código** (`backend/mp-config.php`):
   ```php
   // Cambiar estas credenciales por las de producción
   define('MP_ACCESS_TOKEN', 'APP-TU_ACCESS_TOKEN_PRODUCCION');
   define('MP_PUBLIC_KEY', 'APP-TU_PUBLIC_KEY_PRODUCCION');
   define('MP_SANDBOX_MODE', false);  // ⚠️ MUY IMPORTANTE
   ```

3. **Cambiar la BASE_URL a tu dominio real**:
   ```php
   define('BASE_URL', 'https://tudominio.com');
   ```

4. **Eliminar el script de prueba**:
   ```bash
   rm backend/test-webhook.php
   ```

---

## 📚 Recursos Adicionales

- [Documentación oficial de Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel)
- [Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

---

## ✅ Checklist Final

- [ ] Webhook configurado en el panel de MP (modo prueba)
- [ ] URL del webhook es la correcta
- [ ] Eventos "payment" están seleccionados
- [ ] Webhook está en estado "Activo"
- [ ] Pago de prueba realizado exitosamente
- [ ] Notificación recibida en el log
- [ ] Estado del pedido se actualizó a "pagado"
- [ ] Stock se descontó correctamente

---

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:

1. **Revisa el log del webhook**:
   ```bash
   tail -f backend/logs/mp-notifications.log
   ```

2. **Revisa el historial de webhooks en el panel de MP**
   - Ve a Webhooks → Historial
   - Busca notificaciones con código de error (500, 404, etc.)

3. **Verifica que ngrok esté activo** (si lo estás usando):
   ```bash
   # Deberías ver tu túnel activo
   ngrok http 80
   ```

---

¡Listo! Ahora tu webhook está configurado y funcionando. 🎉

Cada vez que un cliente pague con Mercado Pago:
1. ✅ Recibirás la notificación
2. ✅ El estado del pedido se actualizará a "pagado"
3. ✅ El stock se descontará automáticamente
4. ✅ Todo quedará registrado en los logs
