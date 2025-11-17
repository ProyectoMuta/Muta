package com.muta.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtTokenProvider {

    // IMPORTANTE: Esta clave secreta debe estar en un archivo de configuración (application.properties)
    // y ser mucho más compleja. Por simplicidad, la dejamos aquí por ahora.
    private final String jwtSecret = "MiClaveSecretaSuperLargaYComplejaParaElCursoDeJWT";

    // Duración del token (ej. 1 hora)
    private final long jwtExpirationInMs = 3600000;

    /**
     * Genera un token JWT para un usuario autenticado.
     */
    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMs);

        return Jwts.builder()
                .setSubject(userDetails.getUsername()) // El "username" es nuestro email
                .setIssuedAt(new Date())
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, jwtSecret)
                .compact();
    }

    /**
     * Extrae el email del usuario desde un token JWT.
     */
    public String getUsernameFromJWT(String token) {
        Claims claims = Jwts.parser()
                .setSigningKey(jwtSecret)
                .parseClaimsJws(token)
                .getBody();

        return claims.getSubject();
    }

    /**
     * Valida si un token JWT es correcto (firma, expiración, etc.).
     */
    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(authToken);
            return true;
        } catch (Exception ex) {
            // Aquí se podrían loggear los errores específicos (Token expirado, firma inválida, etc.)
            // Por simplicidad, solo retornamos false.
        }
        return false;
    }
}
