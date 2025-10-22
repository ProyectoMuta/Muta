package com.muta.backend.domain.repository;

import com.muta.backend.domain.model.ProductImage;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends MongoRepository<ProductImage, String> {

    List<ProductImage> findByProductId(Long productId);
}
