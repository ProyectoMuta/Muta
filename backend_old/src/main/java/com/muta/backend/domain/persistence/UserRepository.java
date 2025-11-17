package com.muta.backend.domain.persistence;

import com.muta.backend.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Busca un usuario por su dirección de correo electrónico.
     * Spring Data JPA implementará este método automáticamente.
     * @param email El email del usuario a buscar.
     * @return Un Optional que contiene el usuario si se encuentra, o un Optional vacío si no.
     */
    Optional<User> findByEmail(String email);
}
