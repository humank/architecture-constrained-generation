package com.coffeeshop.reporting.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sales_projections", schema = "reporting")
public class SalesProjection {

    @Id
    @Column(name = "id")
    private UUID id;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Column(name = "table_number", nullable = false)
    private int tableNumber;

    @Column(name = "items", columnDefinition = "TEXT")
    private String items;

    @Column(name = "total", nullable = false)
    private int total;

    @Column(name = "placed_at")
    private LocalDateTime placedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    protected SalesProjection() {
    }

    public SalesProjection(UUID id, UUID orderId, int tableNumber, String items,
                           int total, LocalDateTime placedAt, LocalDateTime completedAt) {
        this.id = id;
        this.orderId = orderId;
        this.tableNumber = tableNumber;
        this.items = items;
        this.total = total;
        this.placedAt = placedAt;
        this.completedAt = completedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public int getTableNumber() {
        return tableNumber;
    }

    public String getItems() {
        return items;
    }

    public int getTotal() {
        return total;
    }

    public LocalDateTime getPlacedAt() {
        return placedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}
