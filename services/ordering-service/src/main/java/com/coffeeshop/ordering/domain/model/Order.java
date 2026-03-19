package com.coffeeshop.ordering.domain.model;

import com.coffeeshop.shared.domain.*;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "orders", schema = "ordering")
public class Order {

    @Id
    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "table_number", nullable = false)
    private int tableNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false)
    private int totalAmount;

    @Column(name = "cash_received")
    private Integer cashReceived;

    @Column(name = "change_given")
    private Integer changeGiven;

    @Column(name = "placed_at", nullable = false)
    private LocalDateTime placedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {
    }

    /**
     * Factory method to create a new order.
     *
     * @param tableNumber table number (1-5)
     * @param itemRequests list of item request data
     * @return a new Order in PLACED status with calculated pricing
     */
    public static Order placeOrder(int tableNumber, List<ItemRequest> itemRequests) {
        if (tableNumber < 1 || tableNumber > 5) {
            throw new IllegalArgumentException("Table number must be between 1 and 5, got: " + tableNumber);
        }
        if (itemRequests == null || itemRequests.isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one item");
        }

        Order order = new Order();
        order.orderId = UUID.randomUUID();
        order.tableNumber = tableNumber;
        order.status = OrderStatus.PLACED;
        order.placedAt = LocalDateTime.now();

        int total = 0;
        for (ItemRequest req : itemRequests) {
            OrderItem item = buildOrderItem(req);
            item.setOrder(order);
            order.items.add(item);
            total += item.getLineTotal();
        }
        order.totalAmount = total;

        return order;
    }

    private static OrderItem buildOrderItem(ItemRequest req) {
        CoffeeType coffeeType = req.coffeeType();
        CoffeeSize size = req.size();
        int quantity = req.quantity();
        List<Customization> customizations = req.customizations() != null ? req.customizations() : List.of();

        if (quantity < 1) {
            throw new IllegalArgumentException("Quantity must be at least 1");
        }

        if (!size.isValidFor(coffeeType)) {
            throw new IllegalArgumentException(
                    "Size " + size + " is not valid for " + coffeeType);
        }

        for (Customization c : customizations) {
            if (!c.isValidFor(coffeeType)) {
                throw new IllegalArgumentException(
                        "Customization " + c + " is not valid for " + coffeeType);
            }
        }

        Money unitPrice = MenuPricing.getPrice(coffeeType, size);
        int surcharge = customizations.stream().mapToInt(Customization::getSurcharge).sum();
        int lineTotal = (unitPrice.amount() + surcharge) * quantity;

        String customizationsStr = customizations.isEmpty() ? null :
                customizations.stream().map(Enum::name).collect(Collectors.joining(","));

        return new OrderItem(
                UUID.randomUUID(),
                coffeeType,
                size,
                quantity,
                customizationsStr,
                unitPrice.amount(),
                surcharge,
                lineTotal
        );
    }

    public void confirm() {
        if (status != OrderStatus.PLACED) {
            throw new IllegalStateException(
                    "Cannot confirm order in status " + status + ", expected PLACED");
        }
        this.status = OrderStatus.CONFIRMED;
        this.confirmedAt = LocalDateTime.now();
    }

    public void processPayment(int cashReceived) {
        if (status != OrderStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Cannot process payment for order in status " + status + ", expected CONFIRMED");
        }
        if (cashReceived < totalAmount) {
            throw new IllegalArgumentException(
                    "Cash received (" + cashReceived + ") is less than total amount (" + totalAmount + ")");
        }
        this.cashReceived = cashReceived;
        this.changeGiven = cashReceived - totalAmount;
        this.status = OrderStatus.PAID;
        this.paidAt = LocalDateTime.now();
    }

    public void markReady() {
        if (status != OrderStatus.PAID) {
            throw new IllegalStateException(
                    "Cannot mark order as ready in status " + status + ", expected PAID");
        }
        this.status = OrderStatus.READY;
    }

    public void deliver() {
        if (status != OrderStatus.READY) {
            throw new IllegalStateException(
                    "Cannot deliver order in status " + status + ", expected READY");
        }
        this.status = OrderStatus.DELIVERED;
        this.deliveredAt = LocalDateTime.now();
    }

    public void complete() {
        if (status != OrderStatus.DELIVERED) {
            throw new IllegalStateException(
                    "Cannot complete order in status " + status + ", expected DELIVERED");
        }
        this.status = OrderStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    // Getters

    public UUID getOrderId() {
        return orderId;
    }

    public int getTableNumber() {
        return tableNumber;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public int getTotalAmount() {
        return totalAmount;
    }

    public Integer getCashReceived() {
        return cashReceived;
    }

    public Integer getChangeGiven() {
        return changeGiven;
    }

    public LocalDateTime getPlacedAt() {
        return placedAt;
    }

    public LocalDateTime getConfirmedAt() {
        return confirmedAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    /**
     * Data transfer object for item creation requests.
     */
    public record ItemRequest(
            CoffeeType coffeeType,
            CoffeeSize size,
            int quantity,
            List<Customization> customizations
    ) {
    }
}
