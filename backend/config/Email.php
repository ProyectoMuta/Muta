<?php

namespace Config;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Email
{
    public static function getMailer(): PHPMailer
    {
        $mail = new PHPMailer(true);

        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['SMTP_USERNAME'] ?? '';
            $mail->Password = $_ENV['SMTP_PASSWORD'] ?? '';
            $mail->SMTPSecure = $_ENV['SMTP_SECURE'] ?? PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $_ENV['SMTP_PORT'] ?? 587;
            $mail->CharSet = 'UTF-8';

            // From
            $mail->setFrom(
                $_ENV['SMTP_FROM_EMAIL'] ?? 'noreply@muta.com',
                $_ENV['SMTP_FROM_NAME'] ?? 'MUTA'
            );

        } catch (Exception $e) {
            error_log("Email configuration error: " . $e->getMessage());
            throw new \Exception("Email configuration failed: " . $e->getMessage());
        }

        return $mail;
    }
}
