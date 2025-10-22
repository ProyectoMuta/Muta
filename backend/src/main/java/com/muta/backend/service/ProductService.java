package com.muta.backend.service;

import com.muta.backend.domain.model.Product;
import com.muta.backend.domain.model.ProductLike;
import com.muta.backend.domain.model.User;
import com.muta.backend.domain.persistence.ProductLikeRepository;
import com.muta.backend.domain.persistence.ProductRepository;
import com.muta.backend.domain.persistence.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityNotFoundException;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductLikeRepository productLikeRepository;

    @Autowired
    public ProductService(ProductRepository productRepository, UserRepository userRepository, ProductLikeRepository productLikeRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.productLikeRepository = productLikeRepository;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product createProduct(Product product) {
        // Aquí iría la lógica de negocio, como validar que solo un Admin puede crear.
        // Esto se haría con Spring Security, por ejemplo.
        return productRepository.save(product);
    }

    @Transactional
    public void likeProduct(Long userId, Long productId) {
        // Verificar si ya existe el like para no duplicarlo
        if (productLikeRepository.findByUserIdAndProductId(userId, productId).isPresent()) {
            // Opcional: podrías lanzar una excepción si se intenta dar like dos veces
            // throw new IllegalStateException("El usuario ya le ha dado 'me gusta' a este producto.");
            return; // No hacer nada si ya existe
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado con id: " + userId));
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + productId));

        ProductLike like = new ProductLike();
        like.setUser(user);
        like.setProduct(product);

        productLikeRepository.save(like);
    }

    @Transactional
    public void unlikeProduct(Long userId, Long productId) {
        ProductLike like = productLikeRepository.findByUserIdAndProductId(userId, productId)
                .orElseThrow(() -> new EntityNotFoundException("No se encontró un 'me gusta' para el usuario " + userId + " y el producto " + productId));

        productLikeRepository.delete(like);
    }

    // Otros métodos de servicio que puedas necesitar...
}
