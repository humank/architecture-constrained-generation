package com.coffeeshop.ordering.domain.model;

import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "order_items", schema = "ordering")
public class OrderItem {

    @Id
    @Column(name = "item_id")
    private UUID itemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "coffee_type", nullable = false)
    private CoffeeType coffeeType;

    @Enumerated(EnumType.STRING)
    @Column(name = "size", nullable = false)
    private CoffeeSize size;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "customizations")
    private String customizations;

    @Column(name = "unit_price", nullable = false)
    private int unitPrice;

    @Column(name = "surcharge", nullable = false)
    private int surcharge;

    @Column(name = "line_total", nullable = false)
    private int lineTotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    protected OrderItem() {
    }

    public OrderItem(UUID itemId, CoffeeType coffeeType, CoffeeSize size, int quantity,
                     String customizations, int unitPrice, int surcharge, int lineTotal) {
        this.itemId = itemId;
        this.coffeeType = coffeeType;
        this.size = size;
        this.quantity = quantity;
        this.customizations = customizations;
        this.unitPrice = unitPrice;
        this.surcharge = surcharge;
        this.lineTotal = lineTotal;
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

    public int getQuantity() {
        return quantity;
    }

    public String getCustomizations() {
        return customizations;
    }

    public int getUnitPrice() {
        return unitPrice;
    }

    public int getSurcharge() {
        return surcharge;
    }

    public int getLineTotal() {
        return lineTotal;
    }

    public Order getOrder() {
        return order;
    }

    void setOrder(Order order) {
        this.order = order;
    }
}
