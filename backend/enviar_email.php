<?php
// backend/enviar_email.php

// Importar las clases de PHPMailer al espacio de nombres global.
// Deben estar al principio del archivo.
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Cargar el autoloader de Composer para que las clases de PHPMailer estén disponibles.
// La ruta sube un nivel ('..') desde 'backend' a la raíz del proyecto para encontrar 'vendor'.
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Envía un correo electrónico de bienvenida a un nuevo usuario.
 *
 * @param string $email La dirección de correo del destinatario.
 * @param string $nombre El nombre del destinatario.
 * @return bool Devuelve true si el correo se envió con éxito, false en caso contrario.
 */
function enviarMailBienvenida($email, $nombre) {
    // Crea una nueva instancia de PHPMailer; `true` habilita las excepciones.
    $mail = new PHPMailer(true);

    try {
        // ==========================================================
        // ===       CONFIGURACIÓN DEL SERVIDOR (SMTP GMAIL)      ===
        // ==========================================================
        
        // Habilitar el modo de depuración detallado (opcional, útil para solucionar problemas)
        // $mail->SMTPDebug = 2; // SMTP::DEBUG_SERVER;

        // Configurar para usar SMTP.
        $mail->isSMTP();
        
        // El servidor SMTP de Gmail.
        $mail->Host = 'smtp.gmail.com';
        
        // Habilitar la autenticación SMTP.
        $mail->SMTPAuth = true;
        
        // TU DIRECCIÓN DE CORREO DE GMAIL.
        $mail->Username = 'nosotros.somos.muta@gmail.com'; // <--- CAMBIAR ESTO
        
        // TU CONTRASEÑA DE APLICACIÓN DE GMAIL.
        // NO es tu contraseña normal de Gmail. Debes generarla en la configuración de tu cuenta de Google.
        $mail->Password = 'xumk byvd lcex semd'; // <--- CAMBIAR ESTO
        
        // Habilitar cifrado TLS implícito.
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        
        // Puerto TCP para conectarse; usa 587 para `PHPMailer::ENCRYPTION_STARTTLS` o 465 para `PHPMailer::ENCRYPTION_SMTPS`.
        $mail->Port = 465;

        // ==========================================================
        // ===                  REMITENTE Y DESTINATARIO          ===
        // ==========================================================
        
        // Quién envía el correo. Usa la misma dirección que en 'Username'.
        // El segundo parámetro es el nombre que verá el destinatario.
        $mail->setFrom('tu_correo@gmail.com', 'MUTA Tienda'); // <--- CAMBIAR ESTO
        
        // A quién se envía el correo.
        $mail->addAddress($email, $nombre);


        // ==========================================================
        // ===                    CONTENIDO DEL CORREO              ===
        // ==========================================================
        
        // Configurar el correo para que sea en formato HTML.
        $mail->isHTML(true);
        
        // Asunto del correo.
        $mail->Subject = 'Bienvenido/a a MUTA!';
        
        // Cuerpo del correo en HTML. Puedes usar cualquier etiqueta HTML aquí.
        $mail->Body    = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h1 style='color: #570a9fff;'>¡Hola, " . htmlspecialchars($nombre) . "!</h1>
                <p>Te damos la bienvenida a <strong>MUTA</strong>, tu nueva tienda de ropa favorita.</p>
                <p>Estamos muy contentos de que te unas a nuestra comunidad. Ya puedes empezar a explorar nuestras colecciones y encontrar tus próximos looks.</p>
                <p>¡Gracias por registrarte!</p>
                <br>
                <p>Saludos,<br>El equipo de MUTA</p>
            </div>
        ";
        
        // Cuerpo alternativo en texto plano para clientes de correo que no soportan HTML.
        $mail->AltBody = "¡Hola, " . htmlspecialchars($nombre) . "! Te damos la bienvenida a MUTA, tu nueva tienda de ropa favorita. Gracias por registrarte.";

        // Enviar el correo.
        $mail->send();
        
        // Si llega hasta aquí, el correo se envió correctamente.
        return true;

    } catch (Exception $e) {
        // Si ocurre un error, se captura la excepción.
        // Registramos el error en un archivo de log para poder revisarlo después,
        // en lugar de mostrarlo en pantalla y potencialmente romper la respuesta JSON.
        $log_message = "Error al enviar correo a $email: " . $mail->ErrorInfo . "\n";
        file_put_contents(__DIR__ . '/mailer_errors.log', $log_message, FILE_APPEND);
        
        // Devolvemos false para indicar que hubo un fallo.
        return false;
    }
}




function enviarMailRecuperar($email, $nombre, $link) {
    $mail = new PHPMailer(true);

    try {
        // Configuración SMTP
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'nosotros.somos.muta@gmail.com'; // <--- CAMBIAR
        $mail->Password = 'xumk byvd lcex semd'; // <--- CAMBIAR
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;

        $mail->setFrom('nosotros.somos.muta@gmail.com', 'MUTA Tienda'); // <--- CAMBIAR
        $mail->addAddress($email, $nombre);

        // Contenido
        $mail->isHTML(true);
        $mail->Subject = 'Recuperar tu contrasena | Muta';
        $mail->Body = "
            <div style='font-family: Arial, sans-serif; color: #333;'>
                <h1 style='color: #8A2BE2;'>Hola, " . htmlspecialchars($nombre) . "</h1>
                <p>Recibimos una solicitud para recuperar tu contraseña.</p>
                <p>Hacé clic en el siguiente enlace para crear una nueva contraseña:</p>
                <p><a href='$link' style='color: #8A2BE2; font-weight: bold;'>$link</a></p>
                <br>
                <p>Si no fuiste vos, ignorá este mensaje.</p>
                <br>
                <p>Saludos,<br>El equipo de MUTA</p>
            </div>
        ";
        $mail->AltBody = "Hola " . htmlspecialchars($nombre) . ", hacé clic para recuperar tu contraseña: $link";

        $mail->send();
        return true;

    } catch (Exception $e) {
        $log_message = "Error al enviar correo de recuperación a $email: " . $mail->ErrorInfo . "\n";
        file_put_contents(__DIR__ . '/mailer_errors.log', $log_message, FILE_APPEND);
        return false;
    }
}







?>