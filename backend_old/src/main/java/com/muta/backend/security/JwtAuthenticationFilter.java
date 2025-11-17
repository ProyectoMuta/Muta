package com.muta.backend.security;

import com.muta.backend.service.CustomUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. Obtener el token de la petición
            String jwt = getJwtFromRequest(request);

            // 2. Validar el token y que el usuario no esté ya autenticado
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // 3. Obtener el email del token
                String username = tokenProvider.getUsernameFromJWT(jwt);

                // 4. Cargar los detalles del usuario desde la base de datos
                UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);

                // 5. Crear el objeto de autenticación
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 6. Establecer la autenticación en el contexto de seguridad de Spring
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            // En caso de error, no hacemos nada y dejamos que la petición continúe sin autenticación.
            // Los filtros de seguridad de Spring se encargarán de denegarla si el endpoint es protegido.
            logger.error("No se pudo establecer la autenticación de usuario en el contexto de seguridad", ex);
        }

        // Continuar con la cadena de filtros
        filterChain.doFilter(request, response);
    }

    /**
     * Extrae el token JWT de la cabecera 'Authorization'.
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
