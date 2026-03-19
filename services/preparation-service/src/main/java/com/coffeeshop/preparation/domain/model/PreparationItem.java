package com.coffeeshop.preparation.domain.model;

import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "preparation_items", schema = "preparation")
public class PreparationItem {

    @Id
    @Column(name = "item_id")
    private UUID itemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "coffee_type", nullable = false)
    private CoffeeType coffeeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", nullable = false)
    private CoffeeSize size;

    @Column(name = "customizations")
    private String customizations;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ItemPreparationStatus status;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    protected PreparationItem() {
    }

    public PreparationItem(UUID itemId, CoffeeType coffeeType, CoffeeSize size, String customizations) {
        this.itemId = itemId;
        this.coffeeType = coffeeType;
        this.size = size;
        this.customizations = customizations;
        this.status = ItemPreparationStatus.PENDING;
    }

    public UUID getItemId() {
        return itemId;
    }

    public CoffeeType getCoffeeType() {
        return coffeeType;
    }

    public CoffeeSize getSize() {
        return size;
    }

    public String getCustomizations() {
        return customizations;
    }

    public ItemPreparationStatus getStatus() {
        return status;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    void markInProgress() {
        if (this.status != ItemPreparationStatus.PENDING) {
            throw new IllegalStateException(
                    "Cannot start item " + itemId + ": current status is " + status);
        }
        this.status = ItemPreparationStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
    }

    void markDone() {
        if (this.status != ItemPreparationStatus.IN_PROGRESS) {
            throw new IllegalStateException(
                    "Cannot complete item " + itemId + ": current status is " + status);
        }
        this.status = ItemPreparationStatus.DONE;
        this.completedAt = LocalDateTime.now();
    }
}
