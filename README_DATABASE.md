conectar en la web mediante http://localhost/muta/index.html

agregrar el proyecto a la carpeta C:\xampp\htdocs

Tener instalado composer y agregado al path.
En D:\Muta\backend (cambiar a direcciond e tu proyecto), abrir cmd y hacer:

rmdir /s /q vendor
composer install

Descargar la extensión MongoDB para PHP

Andá a la página oficial de PECL: https://pecl.php.net/package/mongodb/2.1.4/windows

Elegí la versión que coincida con tu PHP (yo snt uso PHP 8.2.12 ).

Descargá el .dll correcto según tu arquitectura:
x64 si tu PHP es de 64 bits (lo más común en XAMPP moderno).
Thread Safe (TS) si tu PHP es TS (lo podés ver ejecutando php -i | find "Thread").
Ejemplo: php_mongodb-1.16.2-8.2-ts-x64.zip.

1. MySQL/MariaDB (desde XAMPP) / PHPMYADMIN
1.1 Crear base de datos y usuario
Ejecutar en phpMyAdmin pestaña SQL

sql
-- Crear base de datos
CREATE DATABASE mutaDB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- borrar usuario si lo tienen por las dudas poner:
DROP USER 'muta_dev'@'localhost';
FLUSH PRIVILEGES;

1.3 Crear tabla de usuarios
Ejecutar en mutaDB:

sql
CREATE TABLE usuarios ( 
    id INT AUTO_INCREMENT PRIMARY KEY, 
    nombre VARCHAR(100) NOT NULL, 
    email VARCHAR(150) NOT NULL UNIQUE, 
    password_hash VARCHAR(255) NOT NULL, 
    rol ENUM('admin','cliente') DEFAULT 'cliente', 
    estado ENUM('Activo','Inactivo') DEFAULT 'Activo' 
    );

IMPORTANTE
-- Si ya tienen las db limpien los registros por las dudas antes de probar:
En phpMyADMIN
en mutaDB
TRUNCATE TABLE usuarios;

con mongod
cmd: mongosh

use mutaDB
db.usuarios_datos.deleteMany({});
db.products.deleteMany({});

borren el contenido de la carpeta "uploads" del proyecto o muevan el contenido fuera del proyecto para su uso


2. MongoDB
2.1 Instalación
Descargar MongoDB Community Server desde: https://www.mongodb.com/try/download/community

Instalar con las opciones por defecto (incluyendo MongoDB Compass).

Verificar que el servicio mongod esté corriendo en localhost:27017.

2.2 Probar conexión
En consola:

mongosh

y luego:

use mutaDB
db.usuarios_datos.find()

Si devuelve [], significa que la base está lista (aunque vacía). ⚠️ No hace falta crear la base ni la colección manualmente: se crean automáticamente al insertar datos desde el backend.

2.3 Posibles errores y soluciones

Error: Unable to load dynamic library 'php_mongodb.dll'
Descargar la extensión correcta desde PECL:
PHP 8.2
x64
Thread Safe (TS)
Copiar php_mongodb.dll a C:\xampp\php\ext\

En php.ini, agregar:
extension=php_mongodb.dll


Error: Class "MongoDB\Client" not found
Falta instalar la librería de PHP para MongoDB con Composer:

composer require mongodb/mongodb


Error: Failed to open stream: vendor/autoload.php
No se ejecutó composer install.
Solución:

composer install


Error: Could not scan for classes inside symfony/polyfill-php85
La carpeta vendor/ está corrupta o incompleta.
Solución:

rmdir /s /q vendor
composer install

3. GOOGLE 
🔧 PASO 1: CONFIGURAR PHP PARA ENVIAR EMAILS
═══════════════════════════════════════════════════════════════════

1. Descargá el certificado SSL:
   https://curl.se/ca/cacert.pem
   (Guardar como → cacert.pem)

2. Creá estas carpetas si no existen:
   C:\xampp\php\extras\ssl\

3. Copiá el archivo cacert.pem a:
   C:\xampp\php\extras\ssl\cacert.pem

4. Abrí el archivo: C:\xampp\php\php.ini

5. Buscá estas líneas (CTRL + F) y modificalas:

   ANTES:
   ;curl.cainfo =
   
   DESPUÉS:
   curl.cainfo = "C:\xampp\php\extras\ssl\cacert.pem"

   ANTES:
   ;openssl.cafile=
   
   DESPUÉS:
   openssl.cafile = "C:\xampp\php\extras\ssl\cacert.pem"

6. Guardá el archivo php.ini

7. Abrí el Panel de Control de XAMPP y reiniciá Apache:
   - Stop Apache
   - Start Apache



💾 PASO 2: CONFIGURAR LA BASE DE DATOS
═══════════════════════════════════════════════════════════════════


1. Si ya creaste la base de datos "mutaDB" manualmente, otorgá permisos:
   - SQL → Ejecutá:
   
   GRANT ALL PRIVILEGES ON mutaDB.* TO 'muta_dev'@'localhost';
   FLUSH PRIVILEGES;


B) CREAR LA TABLA DE USUARIOS:

1. Seleccioná la base de datos "mutaDB"

2. Andá a la pestaña "SQL"

3. Pegá y ejecutá este código:

ALTER TABLE `usuarios`
ADD COLUMN `google_id` VARCHAR(255) DEFAULT NULL AFTER `email`,
ADD COLUMN `reset_token` VARCHAR(64) DEFAULT NULL AFTER `estado`,
ADD COLUMN `reset_token_expires_at` DATETIME DEFAULT NULL AFTER `reset_token`;


📦 PASO 3: INSTALAR PHPMAILER
═══════════════════════════════════════════════════════════════════

1. Abrí el CMD en la RAÍZ de tu proyecto (donde está la carpeta backend)

   Ejemplo: cd C:\xampp\htdocs\Muta

2. Ejecutá:

   composer require phpmailer/phpmailer

3. Esperá a que termine la instalación. Se creará una carpeta "vendor"




🚀 PASO 4: PROBAR EL SISTEMA
═══════════════════════════════════════════════════════════════════

1. Abrí tu navegador y andá a:
   http://localhost/Muta/

22. Probá estas funciones:

   ✅ REGISTRO:
   - Clic en "Registrarse"
   - Completá el formulario
   - Deberías recibir un email de bienvenida

   ✅ LOGIN:
   - Ingresá con tu email y contraseña
   - Deberías poder iniciar sesión

   ✅ RECUPERAR CONTRASEÑA:
   - Clic en "¿Olvidaste tu contraseña?"
   - Ingresá tu email
   - Deberías recibir UN SOLO email con un link
   - Hacé clic en el link
   - Ingresá tu nueva contraseña
   - Deberías poder iniciar sesión con la nueva contraseña


⚠️ SOLUCIÓN DE PROBLEMAS COMUNES
═══════════════════════════════════════════════════════════════════

🔴 Error: "Call to undefined function MongoDB\Driver\..."
   Solución: Instalá la extensión de MongoDB para PHP
   - Descargá el .dll desde: https://pecl.php.net/package/mongodb
   - Copialo a C:\xampp\php\ext\
   - Agregá en php.ini: extension=mongodb
   - Reiniciá Apache

🔴 Error: "No se puede enviar el email"
   Solución:
   - Verificá que configuraste cacert.pem correctamente
   - Verificá que usaste la contraseña de aplicación de Gmail
   - Revisá el archivo: backend/mailer_errors.log

🔴 Error: "Access denied for user 'muta_dev'"
   Solución:
   - Verificá que creaste el usuario en phpMyAdmin
   - Verificá que la contraseña sea "muta123"
   - Ejecutá: GRANT ALL PRIVILEGES ON mutaDB.* TO 'muta_dev'@'localhost';

🔴 Se envían múltiples emails
   Solución:
   - Limpiá la caché del navegador (Ctrl + Shift + R)
   - Verificá que user-session.js tenga la variable recuperacionListenerAdded

🔴 Error: "Token inválido"
   Solución:
   - Verificá que las columnas en la BD sean:
     reset_token (VARCHAR 64)
     reset_token_expires_at (DATETIME)
   - No usen guiones en los nombres
   
4. Resumen
MySQL: crear mutaDB

MongoDB: instalar Community Server, no requiere configuración inicial, se autogenera al insertar.

Errores comunes: extensión PHP, dependencias de Composer, librerías faltantes → soluciones arriba.
