<?php
require __DIR__ . '/vendor/autoload.php';

echo "<h2>Test de Google API Client</h2>";

if (class_exists('Google\Client')) {
    echo "✅ Google\\Client está instalado<br>";
    
    try {
        $client = new Google\Client();
        echo "✅ Se puede crear instancia de Google\\Client<br>";
        
        $client->setClientId("342902827600-gafqbggc11nsh2uqeue9t2v7gvb2s5ra.apps.googleusercontent.com");
        echo "✅ Se puede configurar Client ID<br>";
        
        echo "<br><strong>Todo funciona correctamente!</strong>";
    } catch (Exception $e) {
        echo "❌ Error al crear instancia: " . $e->getMessage();
    }
} else {
    echo "❌ Google\\Client NO está disponible<br>";
    echo "Verifica que vendor/autoload.php existe en /backend/";
}

echo "<hr>";
echo "Vendor path: " . realpath(__DIR__ . '/vendor/autoload.php');