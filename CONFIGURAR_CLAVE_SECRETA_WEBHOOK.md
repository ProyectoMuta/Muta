# 🔐 Configurar la Clave Secreta del Webhook de Mercado Pago

Cuando configuras un webhook en Mercado Pago, te proporciona una **Clave Secreta** (Secret Key). Esta clave es fundamental para la seguridad de tu integración.

---

## ❓ ¿Para Qué Sirve la Clave Secreta?

La clave secreta permite **validar que las notificaciones realmente vienen de Mercado Pago** y no de un atacante que intenta suplantar su identidad.

**Mercado Pago firma cada notificación** usando esta clave, y tu servidor puede verificar esa firma para asegurarse de que es auténtica.

---

## 📍 Dónde Conseguir la Clave Secreta

### Paso 1: Configurar el Webhook en Mercado Pago

1. Ve a: **https://www.mercadopago.com.ar/developers/panel**
2. Selecciona tu aplicación
3. Ve a **"Webhooks"** o **"Notificaciones"**
4. Ingresa la URL de tu webhook
5. Selecciona eventos: **"payment"**
6. Haz clic en **"Guardar"**

### Paso 2: Copiar la Clave Secreta

Después de guardar, Mercado Pago te mostrará:

```
🔑 Secret Key (Clave Secreta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Guarda esta clave en un lugar seguro.
   No la compartas públicamente ni la subas a repositorios.
```

**COPIA ESA CLAVE** (es un string largo alfanumérico).

---

## 📝 Dónde Poner la Clave Secreta

### Opción 1: En el Archivo de Configuración (Recomendado)

Abre el archivo **`backend/mp-config.php`** y busca esta línea:

```php
define('MP_WEBHOOK_SECRET', 'TU_CLAVE_SECRETA_AQUI');
```

**Reemplázala** con tu clave secreta real:

```php
define('MP_WEBHOOK_SECRET', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3');
```

### Opción 2: Como Variable de Entorno (Más Seguro)

Si no quieres guardar la clave en el código, puedes usar variables de entorno:

1. **Crea un archivo `.env`** en la raíz de tu proyecto:
   ```bash
   touch .env
   ```

2. **Agrega la clave secreta**:
   ```
   MP_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3
   ```

3. **Carga la variable en `mp-config.php`**:
   ```php
   // Cargar variable de entorno
   $secretFromEnv = getenv('MP_WEBHOOK_SECRET');

   if ($secretFromEnv) {
       define('MP_WEBHOOK_SECRET', $secretFromEnv);
   } else {
       define('MP_WEBHOOK_SECRET', 'TU_CLAVE_SECRETA_AQUI');
   }
   ```

4. **Agrega `.env` al `.gitignore`**:
   ```bash
   echo ".env" >> .gitignore
   ```

---

## 🔒 Seguridad: NUNCA Compartas Esta Clave

⚠️ **MUY IMPORTANTE:**

- ❌ NO la compartas con nadie
- ❌ NO la subas a repositorios públicos (GitHub, GitLab, etc.)
- ❌ NO la expongas en tu frontend
- ✅ Guárdala solo en tu servidor backend
- ✅ Agrégala al `.gitignore` si la guardas en un archivo

---

## ✅ Verificar que Funciona

Después de configurar la clave secreta, realiza un pago de prueba.

### Ver el Log

```bash
tail -f backend/logs/mp-notifications.log
```

Deberías ver:

```
[2025-01-30 15:30:15] Webhook recibido - GET: {"topic":"payment","id":"1234567890"}
[2025-01-30 15:30:16] ✅ Firma del webhook validada correctamente
[2025-01-30 15:30:17] Procesando notificación - Topic: payment, ID: 1234567890
```

### Si la Clave es Incorrecta

Verás en el log:

```
[2025-01-30 15:30:16] ❌ ALERTA: Firma del webhook inválida. Posible intento de suplantación.
[2025-01-30 15:30:16] Expected: abc123..., Received: xyz789...
[2025-01-30 15:30:16] ❌ Notificación rechazada por firma inválida
```

---

## 🧪 Probar la Validación de Firma

### Opción 1: Pago de Prueba Real

La forma más fácil es hacer un pago de prueba real:

1. Crea un pedido en tu aplicación
2. Paga con tarjeta de prueba:
   ```
   Número: 5031 7557 3453 0604
   Nombre: APRO
   CVV: 123
   Vencimiento: 12/26
   ```
3. Mercado Pago enviará la notificación firmada
4. Verifica el log para ver si la firma se validó correctamente

### Opción 2: Probar Manualmente (Avanzado)

Si quieres probar la validación sin hacer un pago:

```bash
# Esto fallará porque no tendrá la firma correcta
curl -X POST "https://tu-dominio.com/backend/mp-webhook.php?topic=payment&id=123456"

# En el log deberías ver:
# ADVERTENCIA: No se recibieron headers de firma
```

---

## ⚠️ ¿Qué Pasa Si No Configuro la Clave Secreta?

El webhook **seguirá funcionando**, pero sin validación de seguridad:

```
[2025-01-30 15:30:15] ADVERTENCIA: Clave secreta del webhook no configurada. Saltando validación de firma.
```

Esto significa que **cualquiera podría enviar notificaciones falsas** a tu webhook.

**Recomendación**: Configura la clave secreta para mayor seguridad, especialmente en producción.

---

## 🚀 Configuración para Producción

Cuando pases a producción:

### 1. Obtén una Nueva Clave Secreta de Producción

1. En el panel de Mercado Pago, cambia a **"Credenciales de producción"**
2. Configura el webhook para producción
3. Copia la **nueva clave secreta de producción**

### 2. Actualiza tu Configuración

En `backend/mp-config.php`:

```php
// Credenciales de PRODUCCIÓN
define('MP_ACCESS_TOKEN', 'APP-TU_ACCESS_TOKEN_PRODUCCION');
define('MP_PUBLIC_KEY', 'APP-TU_PUBLIC_KEY_PRODUCCION');
define('MP_WEBHOOK_SECRET', 'CLAVE_SECRETA_PRODUCCION_AQUI');

// Cambiar a modo producción
define('MP_SANDBOX_MODE', false);
```

---

## 📋 Checklist de Configuración

- [ ] Obtuviste la clave secreta del panel de Mercado Pago
- [ ] La agregaste a `backend/mp-config.php`
- [ ] La clave NO está en el código públicamente visible
- [ ] El archivo con la clave está en `.gitignore` (si corresponde)
- [ ] Hiciste un pago de prueba
- [ ] El log muestra "✅ Firma del webhook validada correctamente"
- [ ] No hay errores de firma inválida en el log

---

## 🆘 Solución de Problemas

### Problema 1: "Firma inválida" en el log

**Causa**: La clave secreta en tu código no coincide con la del panel de Mercado Pago

**Solución**:
1. Ve al panel de Mercado Pago
2. Ve a Webhooks → Tu webhook
3. Copia nuevamente la clave secreta
4. Pégala en `backend/mp-config.php`
5. Guarda el archivo
6. Prueba nuevamente

### Problema 2: "No se recibieron headers de firma"

**Causa**: Mercado Pago no está enviando los headers de firma (común en sandbox)

**Solución**: Esto es normal en modo prueba. El webhook permite notificaciones sin firma si la clave no está configurada. En producción, Mercado Pago siempre envía la firma.

### Problema 3: No encuentro la clave secreta en el panel

**Causa**: Puede variar según la versión del panel de Mercado Pago

**Dónde buscar**:
1. **Webhooks** → Haz clic en tu webhook configurado → Verás la "Secret Key"
2. **Notificaciones** → **Configuración** → "Clave secreta"
3. Después de crear el webhook, aparece en un modal o mensaje

Si no la encuentras, intenta:
- Eliminar el webhook y crearlo de nuevo
- Buscar "Secret" o "Clave secreta" en el panel
- Contactar soporte de Mercado Pago

---

## 📚 Recursos Adicionales

- [Documentación oficial de Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)
- [Validación de firma](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#validar-firma)

---

## ✅ Resumen

1. **Obtén la clave secreta** del panel de Mercado Pago (al configurar el webhook)
2. **Pégala en** `backend/mp-config.php`:
   ```php
   define('MP_WEBHOOK_SECRET', 'TU_CLAVE_SECRETA_AQUI');
   ```
3. **Prueba con un pago de prueba** y verifica el log
4. **En producción**, usa una clave secreta diferente

¡Listo! Tu webhook ahora está protegido contra notificaciones falsas. 🔒
