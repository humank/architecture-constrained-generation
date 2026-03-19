package com.coffeeshop.ordering.application;

import com.coffeeshop.ordering.domain.event.*;
import com.coffeeshop.ordering.domain.model.Order;
import com.coffeeshop.ordering.domain.model.OrderItem;
import com.coffeeshop.ordering.domain.model.OrderStatus;
import com.coffeeshop.ordering.infrastructure.messaging.OrderEventPublisher;
import com.coffeeshop.ordering.infrastructure.persistence.OrderRepository;
import com.coffeeshop.shared.domain.CoffeeSize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderEventPublisher eventPublisher;

    public OrderService(OrderRepository orderRepository, OrderEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    public Order placeOrder(int tableNumber, List<Order.ItemRequest> items) {
        Order order = Order.placeOrder(tableNumber, items);
        order = orderRepository.save(order);

        eventPublisher.publish(new OrderPlaced(
                UUID.randomUUID(),
                LocalDateTime.now(),
                order.getOrderId(),
                order.getTableNumber(),
                order.getTotalAmount()
        ));

        return order;
    }

    public Order confirmOrder(UUID orderId) {
        Order order = findOrderOrThrow(orderId);
        order.confirm();
        order = orderRepository.save(order);

        eventPublisher.publish(new OrderConfirmed(
                UUID.randomUUID(),
                LocalDateTime.now(),
                order.getOrderId(),
                order.getTableNumber()
        ));

        return order;
    }

    public Order processPayment(UUID orderId, int cashReceived) {
        Order order = findOrderOrThrow(orderId);
        order.processPayment(cashReceived);
        order = orderRepository.save(order);

        eventPublisher.publish(new PaymentProcessed(
                UUID.randomUUID(),
                LocalDateTime.now(),
                order.getOrderId(),
                order.getTotalAmount(),
                order.getCashReceived(),
                order.getChangeGiven()
        ));

        // Submit to barista after payment
        List<OrderSubmittedToBarista.ItemDetail> itemDetails = order.getItems().stream()
                .map(this::toItemDetail)
                .toList();

        eventPublisher.publish(new OrderSubmittedToBarista(
                UUID.randomUUID(),
                LocalDateTime.now(),
                order.getOrderId(),
                order.getTableNumber(),
                itemDetails
        ));

        return order;
    }

    public Order markReady(UUID orderId) {
        Order order = findOrderOrThrow(orderId);
        order.markReady();
        return orderRepository.save(order);
    }

    public Order deliverOrder(UUID orderId) {
        Order order = findOrderOrThrow(orderId);
        order.deliver();
        return orderRepository.save(order);
    }

    public Order completeOrder(UUID orderId) {
        Order order = findOrderOrThrow(orderId);
        order.complete();
        order = orderRepository.save(order);

        List<OrderCompleted.ItemSummary> itemSummaries = order.getItems().stream()
                .map(item -> new OrderCompleted.ItemSummary(
                        item.getCoffeeType().name(),
                        item.getSize().name(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        parseCustomizations(item.getCustomizations())
                ))
                .toList();

        eventPublisher.publish(new OrderCompleted(
                UUID.randomUUID(),
                LocalDateTime.now(),
                order.getOrderId(),
                order.getTableNumber(),
                itemSummaries,
                order.getTotalAmount(),
                order.getPlacedAt(),
                order.getCompletedAt()
        ));

        return order;
    }

    @Transactional(readOnly = true)
    public List<Order> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status);
    }

    @Transactional(readOnly = true)
    public Order getOrderById(UUID orderId) {
        return findOrderOrThrow(orderId);
    }

    private Order findOrderOrThrow(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));
    }

    private OrderSubmittedToBarista.ItemDetail toItemDetail(OrderItem item) {
        List<String> customizations = parseCustomizations(item.getCustomizations());
        int shots = item.getSize().getShots();

        // Build recipe based on coffee type, size, and customizations
        List<OrderSubmittedToBarista.Ingredient> ingredients = new java.util.ArrayList<>();

        // Coffee beans: 20g per shot
        ingredients.add(new OrderSubmittedToBarista.Ingredient("Coffee beans", shots * 20.0, "g"));

        // Filter paper: 1 per item
        ingredients.add(new OrderSubmittedToBarista.Ingredient("Filter paper", 1.0, "sheets"));

        boolean useSoyMilk = customizations.contains("SoyMilk");

        switch (item.getCoffeeType()) {
            case Americano -> {
                // No milk needed
            }
            case Latte -> {
                // Latte uses milk (or soy milk)
                double milkMl = shots == 1 ? 150.0 : 250.0;
                String milkType = useSoyMilk ? "Soy milk" : "Milk";
                ingredients.add(new OrderSubmittedToBarista.Ingredient(milkType, milkMl, "ml"));
            }
            case Cappuccino -> {
                // Cappuccino uses milk (or soy milk)
                double milkMl = shots == 1 ? 100.0 : 180.0;
                String milkType = useSoyMilk ? "Soy milk" : "Milk";
                ingredients.add(new OrderSubmittedToBarista.Ingredient(milkType, milkMl, "ml"));

                // Whipped cream if customized
                if (customizations.contains("WhippedCream")) {
                    ingredients.add(new OrderSubmittedToBarista.Ingredient("Whipped cream", 20.0, "ml"));
                }
            }
            case Espresso -> {
                // Pure espresso, no additional ingredients
            }
        }

        return new OrderSubmittedToBarista.ItemDetail(
                item.getItemId(),
                item.getCoffeeType().name(),
                item.getSize().name(),
                item.getQuantity(),
                customizations,
                new OrderSubmittedToBarista.Recipe(ingredients)
        );
    }

    private List<String> parseCustomizations(String customizations) {
        if (customizations == null || customizations.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.asList(customizations.split(","));
    }
}
