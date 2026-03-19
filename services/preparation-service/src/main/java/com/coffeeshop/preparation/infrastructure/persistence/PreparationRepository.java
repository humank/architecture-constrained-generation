package com.coffeeshop.preparation.infrastructure.persistence;

import com.coffeeshop.preparation.domain.model.Preparation;
import com.coffeeshop.preparation.domain.model.PreparationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PreparationRepository extends JpaRepository<Preparation, UUID> {

    List<Preparation> findByStatusIn(List<PreparationStatus> statuses);

    Optional<Preparation> findByOrderId(UUID orderId);

    boolean existsByOrderId(UUID orderId);
}
