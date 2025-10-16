conectar en la web mediante http://localhost/muta/index.html

agregrar el proyecto a la carpeta C:\xampp\htdocs

Tener instalado composer y agregado al path.
En D:\Muta\backend (cambiar a direcciond e tu proyecto), abrir cmd y hacer:
composer install

Descargar la extensión MongoDB para PHP

Andá a la página oficial de PECL: https://pecl.php.net/package/mongodb/2.1.4/windows

Elegí la versión que coincida con tu PHP (yo snt uso PHP 8.2.12 ).

Descargá el .dll correcto según tu arquitectura:
x64 si tu PHP es de 64 bits (lo más común en XAMPP moderno).
Thread Safe (TS) si tu PHP es TS (lo podés ver ejecutando php -i | find "Thread").
Ejemplo: php_mongodb-1.16.2-8.2-ts-x64.zip.

1. MySQL/MariaDB (desde XAMPP)
1.1 Crear base de datos y usuario
Ejecutar en phpMyAdmin (pestaña SQL) o en consola:

sql
-- Crear base de datos
CREATE DATABASE mutaDB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Crear usuario muta_dev con contraseña muta123
CREATE USER 'muta_dev'@'localhost' IDENTIFIED BY 'muta123';

-- Darle todos los permisos sobre la base mutaDB
GRANT ALL PRIVILEGES ON mutaDB.* TO 'muta_dev'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;
1.2 Probar conexión
En consola:

mysql -u muta_dev -p mutaDB

Ingresar la contraseña muta123. Si entra sin problemas, la base y el usuario están listos.

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


3. Resumen
MySQL: crear mutaDB, usuario muta_dev/muta123, tabla usuarios.

MongoDB: instalar Community Server, no requiere configuración inicial, se autogenera al insertar.

Errores comunes: extensión PHP, dependencias de Composer, librerías faltantes → soluciones arriba.
