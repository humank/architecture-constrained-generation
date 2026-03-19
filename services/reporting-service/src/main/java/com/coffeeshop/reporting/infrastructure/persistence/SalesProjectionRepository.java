package com.coffeeshop.reporting.infrastructure.persistence;

import com.coffeeshop.reporting.domain.model.SalesProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SalesProjectionRepository extends JpaRepository<SalesProjection, UUID> {
    Optional<SalesProjection> findByOrderId(UUID orderId);
    boolean existsByOrderId(UUID orderId);
}
