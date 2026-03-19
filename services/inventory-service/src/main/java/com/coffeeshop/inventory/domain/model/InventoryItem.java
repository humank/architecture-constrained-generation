package com.coffeeshop.inventory.domain.model;

import com.coffeeshop.inventory.domain.event.IngredientDeducted;
import com.coffeeshop.inventory.domain.event.LowStockAlertTriggered;
import com.coffeeshop.shared.domain.DomainEvent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "inventory_items", schema = "inventory")
public class InventoryItem {

    @Id
    @Column(name = "material_id")
    private String materialId;

    @Column(name = "material_name", nullable = false)
    private String materialName;

    @Column(name = "current_level", nullable = false)
    private double currentLevel;

    @Column(name = "max_capacity", nullable = false)
    private double maxCapacity;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "alert_threshold", nullable = false)
    private double alertThreshold = 0.3;

    @Column(name = "alert_triggered", nullable = false)
    private boolean alertTriggered = false;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;

    @Transient
    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected InventoryItem() {
    }

    public InventoryItem(String materialId, String materialName, double currentLevel,
                         double maxCapacity, String unit) {
        this.materialId = materialId;
        this.materialName = materialName;
        this.currentLevel = currentLevel;
        this.maxCapacity = maxCapacity;
        this.unit = unit;
        this.alertThreshold = 0.3;
        this.alertTriggered = false;
        this.lastUpdated = LocalDateTime.now();
    }

    public List<DomainEvent> deduct(double quantity) {
        List<DomainEvent> events = new ArrayList<>();

        if (quantity > currentLevel) {
            throw new IllegalStateException(
                    "Insufficient stock for " + materialId + ": requested " + quantity + ", available " + currentLevel);
        }

        this.currentLevel -= quantity;
        this.lastUpdated = LocalDateTime.now();

        double percentageRemaining = getPercentage();

        events.add(new IngredientDeducted(
                UUID.randomUUID(),
                LocalDateTime.now(),
                this.materialId,
                quantity,
                this.currentLevel,
                this.maxCapacity,
                percentageRemaining
        ));

        if ((currentLevel / maxCapacity) < alertThreshold && !alertTriggered) {
            this.alertTriggered = true;
            events.add(new LowStockAlertTriggered(
                    this.materialId,
                    this.currentLevel,
                    this.alertThreshold,
                    this.maxCapacity
            ));
        }

        this.domainEvents.addAll(events);
        return events;
    }

    public void restore() {
        this.currentLevel = this.maxCapacity;
        this.alertTriggered = false;
        this.lastUpdated = LocalDateTime.now();
    }

    public double getPercentage() {
        if (maxCapacity == 0) return 0;
        return (currentLevel / maxCapacity) * 100;
    }

    public List<DomainEvent> getDomainEvents() {
        return List.copyOf(domainEvents);
    }

    public void clearDomainEvents() {
        domainEvents.clear();
    }

    public String getMaterialId() {
        return materialId;
    }

    public String getMaterialName() {
        return materialName;
    }

    public double getCurrentLevel() {
        return currentLevel;
    }

    public double getMaxCapacity() {
        return maxCapacity;
    }

    public String getUnit() {
        return unit;
    }

    public double getAlertThreshold() {
        return alertThreshold;
    }

    public boolean isAlertTriggered() {
        return alertTriggered;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }
}
