package com.muta.backend.service;

import com.muta.backend.domain.model.User;
import com.muta.backend.domain.persistence.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Autowired
    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Spring Security nos pasa el email en el parámetro "username"
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No se encontró un usuario con el email: " + email));
    }
}
