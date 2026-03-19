package com.coffeeshop.reporting.infrastructure.persistence;

import com.coffeeshop.reporting.domain.model.InventoryProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryProjectionRepository extends JpaRepository<InventoryProjection, UUID> {

    @Query("""
            SELECT ip FROM InventoryProjection ip
            WHERE ip.recordedAt = (
                SELECT MAX(ip2.recordedAt) FROM InventoryProjection ip2
                WHERE ip2.material = ip.material
            )
            """)
    List<InventoryProjection> findLatestPerMaterial();
}
