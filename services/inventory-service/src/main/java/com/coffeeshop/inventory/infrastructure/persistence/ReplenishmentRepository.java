package com.coffeeshop.inventory.infrastructure.persistence;

import com.coffeeshop.inventory.domain.model.Replenishment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReplenishmentRepository extends JpaRepository<Replenishment, UUID> {
}
