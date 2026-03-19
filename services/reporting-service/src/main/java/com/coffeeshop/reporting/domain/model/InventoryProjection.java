package com.coffeeshop.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_projections", schema = "reporting")
public class InventoryProjection {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "material", nullable = false)
    private String material;

    @Column(name = "quantity_deducted", nullable = false)
    private double quantityDeducted;

    @Column(name = "remaining_level", nullable = false)
    private double remainingLevel;

    @Column(name = "max_capacity", nullable = false)
    private double maxCapacity;

    @Column(name = "percentage_remaining", nullable = false)
    private double percentageRemaining;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    protected InventoryProjection() {
    }

    public InventoryProjection(UUID id, String material, double quantityDeducted,
                                double remainingLevel, double maxCapacity,
                                double percentageRemaining, LocalDateTime recordedAt) {
        this.id = id;
        this.material = material;
        this.quantityDeducted = quantityDeducted;
        this.remainingLevel = remainingLevel;
        this.maxCapacity = maxCapacity;
        this.percentageRemaining = percentageRemaining;
        this.recordedAt = recordedAt;
    }

    public UUID getId() {
        return id;
    }

    public String getMaterial() {
        return material;
    }

    public double getQuantityDeducted() {
        return quantityDeducted;
    }

    public double getRemainingLevel() {
        return remainingLevel;
    }

    public double getMaxCapacity() {
        return maxCapacity;
    }

    public double getPercentageRemaining() {
        return percentageRemaining;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }
}
