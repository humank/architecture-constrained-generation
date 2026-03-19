package com.coffeeshop.preparation.domain.model;

import com.coffeeshop.preparation.domain.event.CoffeePrepared;
import com.coffeeshop.preparation.domain.event.OrderReadyForDelivery;
import com.coffeeshop.preparation.domain.event.PreparationStarted;
import com.coffeeshop.preparation.domain.service.RecipeResolutionService;
import com.coffeeshop.shared.domain.DomainEvent;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "preparations", schema = "preparation")
public class Preparation {

    @Id
    @Column(name = "preparation_id")
    private UUID preparationId;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Column(name = "table_number", nullable = false)
    private int tableNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PreparationStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "preparation_id", nullable = false)
    private List<PreparationItem> items = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    protected Preparation() {
    }

    public static Preparation createFromOrder(UUID orderId, int tableNumber, List<PreparationItem> items) {
        Preparation preparation = new Preparation();
        preparation.preparationId = UUID.randomUUID();
        preparation.orderId = orderId;
        preparation.tableNumber = tableNumber;
        preparation.status = PreparationStatus.PENDING;
        preparation.items = new ArrayList<>(items);
        preparation.createdAt = LocalDateTime.now();
        return preparation;
    }

    public PreparationStarted startItem(UUID itemId, RecipeResolutionService recipeService) {
        PreparationItem item = findItem(itemId);
        item.markInProgress();

        if (this.status == PreparationStatus.PENDING) {
            this.status = PreparationStatus.IN_PROGRESS;
        }

        List<Ingredient> recipe = recipeService.resolve(
                item.getCoffeeType(), item.getSize(), item.getCustomizations());

        return new PreparationStarted(
                UUID.randomUUID(),
                LocalDateTime.now(),
                this.orderId,
                itemId,
                recipe
        );
    }

    public List<DomainEvent> completeItem(UUID itemId) {
        PreparationItem item = findItem(itemId);
        item.markDone();

        List<DomainEvent> events = new ArrayList<>();
        events.add(new CoffeePrepared(
                UUID.randomUUID(),
                LocalDateTime.now(),
                this.orderId,
                itemId
        ));

        boolean allDone = items.stream()
                .allMatch(i -> i.getStatus() == ItemPreparationStatus.DONE);

        if (allDone) {
            this.status = PreparationStatus.READY;
            this.completedAt = LocalDateTime.now();
            events.add(new OrderReadyForDelivery(
                    UUID.randomUUID(),
                    LocalDateTime.now(),
                    this.orderId,
                    this.tableNumber,
                    this.completedAt
            ));
        }

        return events;
    }

    private PreparationItem findItem(UUID itemId) {
        return items.stream()
                .filter(i -> i.getItemId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Item " + itemId + " not found in preparation " + preparationId));
    }

    public UUID getPreparationId() {
        return preparationId;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public int getTableNumber() {
        return tableNumber;
    }

    public PreparationStatus getStatus() {
        return status;
    }

    public List<PreparationItem> getItems() {
        return items;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}
