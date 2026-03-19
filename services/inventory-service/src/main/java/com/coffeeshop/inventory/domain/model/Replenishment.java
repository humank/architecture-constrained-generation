package com.coffeeshop.inventory.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "replenishments", schema = "inventory")
public class Replenishment {

    @Id
    @Column(name = "replenishment_id")
    private UUID replenishmentId;

    @Column(name = "material_id", nullable = false)
    private String materialId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReplenishmentStatus status;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "supplier")
    private String supplier;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    protected Replenishment() {
    }

    public static Replenishment request(String materialId) {
        Replenishment r = new Replenishment();
        r.replenishmentId = UUID.randomUUID();
        r.materialId = materialId;
        r.status = ReplenishmentStatus.REQUESTED;
        r.requestedAt = LocalDateTime.now();
        return r;
    }

    public void createPurchaseOrder(String supplier, LocalDate expectedDeliveryDate) {
        if (this.status != ReplenishmentStatus.REQUESTED) {
            throw new IllegalStateException(
                    "Cannot create purchase order: current status is " + this.status);
        }
        this.supplier = supplier;
        this.expectedDeliveryDate = expectedDeliveryDate;
        this.status = ReplenishmentStatus.PURCHASE_ORDERED;
    }

    public void confirmDelivery() {
        if (this.status != ReplenishmentStatus.PURCHASE_ORDERED) {
            throw new IllegalStateException(
                    "Cannot confirm delivery: current status is " + this.status);
        }
        this.confirmedAt = LocalDateTime.now();
        this.status = ReplenishmentStatus.DELIVERED;
    }

    public UUID getReplenishmentId() {
        return replenishmentId;
    }

    public String getMaterialId() {
        return materialId;
    }

    public ReplenishmentStatus getStatus() {
        return status;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public String getSupplier() {
        return supplier;
    }

    public LocalDate getExpectedDeliveryDate() {
        return expectedDeliveryDate;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }
}
