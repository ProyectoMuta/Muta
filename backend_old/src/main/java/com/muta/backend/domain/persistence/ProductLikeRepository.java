package com.muta.backend.domain.persistence;

import com.muta.backend.domain.model.ProductLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProductLikeRepository extends JpaRepository<ProductLike, Long> {

    /**
     * Busca un "me gusta" específico basado en el ID del usuario y el ID del producto.
     * JPA creará automáticamente la consulta SQL para este método basándose en su nombre.
     *
     * @param userId El ID del usuario.
     * @param productId El ID del producto.
     * @return Un Optional que contiene el ProductLike si existe, o un Optional vacío si no.
     */
    Optional<ProductLike> findByUserIdAndProductId(Long userId, Long productId);
}
