package com.coffeeshop.ordering.application;

import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Handles OrderReadyForDelivery events consumed from SQS queue ordering-from-preparation.
 * Delegates to OrderService to transition the order to READY status.
 */
@Component
public class OrderReadyEventHandler {

    private final OrderService orderService;

    public OrderReadyEventHandler(OrderService orderService) {
        this.orderService = orderService;
    }

    public void handle(UUID orderId) {
        orderService.markReady(orderId);
    }
}
