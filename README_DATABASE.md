conectar en la web mediante http://localhost/muta/index.html

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
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

---------------------------------------------------------------
📌 Configuración de Alias en Apache (XAMPP)
Si tu proyecto no está dentro de htdocs (por ejemplo, lo tenés en D:\Muta), podés crear un Alias en Apache para que sea accesible desde el navegador sin mover carpetas.

🔹 Pasos
Abrí el archivo de configuración de Apache:

C:\xampp\apache\conf\httpd.conf
Al final del archivo, agregá lo siguiente (ajustando la ruta si tu proyecto está en otra carpeta):

# Alias para el proyecto MUTA
Alias /muta "D:/Muta"

<Directory "D:/Muta">
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

⚠️ Importante: usá / en lugar de \ en las rutas de Windows.

Guardá los cambios y reiniciá Apache desde el panel de XAMPP.

Ahora podés acceder a tu proyecto en:

Código
http://localhost/muta/
Ejemplo para el backend:

Código
http://localhost/muta/backend/productController.php
✅ Con esto, tu proyecto queda accesible sin necesidad de moverlo a htdocs.