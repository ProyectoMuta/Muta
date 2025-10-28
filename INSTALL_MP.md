# 🚀 Instalación Rápida de Mercado Pago

Guía rápida para poner en marcha la integración de Mercado Pago en 5 minutos.

---

## ⚡ Pasos Rápidos

### 1. Instalar SDK de Mercado Pago

```bash
cd /ruta/a/Muta/backend
composer install
```

### 2. Configurar Credenciales

```bash
# Copia el archivo de ejemplo
cp backend/mp-config.example.php backend/mp-config.php

# Edita el archivo con tus credenciales
nano backend/mp-config.php
```

Reemplaza estas líneas con tus credenciales:

```php
define('MP_ACCESS_TOKEN', 'TEST-1234567890...');  // Tu token de prueba
define('MP_PUBLIC_KEY', 'TEST-abcd1234...');      // Tu public key
```

### 3. Obtener Credenciales de Mercado Pago

1. Ve a: https://www.mercadopago.com.ar/developers/panel
2. Inicia sesión
3. Ve a "Credenciales" → "Credenciales de prueba"
4. Copia:
   - **Access Token** (TEST-...)
   - **Public Key** (TEST-...)

### 4. Verificar Instalación

Abre en tu navegador:

```
http://localhost/Muta/backend/pagosController.php?action=test_config
```

Deberías ver:

```json
{
  "success": true,
  "mensaje": "Configuración de Mercado Pago correcta"
}
```

### 5. Probar Pago

1. Agrega productos al carrito
2. Haz checkout
3. Selecciona "Pagar con Mercado Pago"
4. Usa esta tarjeta de prueba:
   - **Número**: 4509 9535 6623 3704
   - **CVV**: 123
   - **Fecha**: 11/25
   - **Nombre**: APRO

---

## 📚 Documentación Completa

Para instrucciones detalladas, configuración de webhooks, pasar a producción, etc., lee:

👉 **[README_MERCADOPAGO.md](README_MERCADOPAGO.md)**

---

## ❓ Problemas Comunes

### "Class MercadoPagoConfig not found"
```bash
cd backend
composer install
```

### "Credenciales no configuradas"
Edita `backend/mp-config.php` con tus credenciales reales.

### "No se redirige a Mercado Pago"
Verifica la consola del navegador (F12) para ver errores.

---

## 📞 Ayuda

Si tienes problemas, revisa el **[README_MERCADOPAGO.md](README_MERCADOPAGO.md)** sección "Solución de Problemas".
