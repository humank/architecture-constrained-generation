package com.coffeeshop.ordering.api.dto;

import com.coffeeshop.ordering.domain.model.Order;
import com.coffeeshop.ordering.domain.model.OrderItem;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
        UUID orderId,
        int tableNumber,
        String status,
        int totalAmount,
        Integer cashReceived,
        Integer changeGiven,
        LocalDateTime placedAt,
        LocalDateTime confirmedAt,
        LocalDateTime paidAt,
        LocalDateTime deliveredAt,
        LocalDateTime completedAt,
        List<OrderItemResponse> items
) {

    public record OrderItemResponse(
            UUID itemId,
            String coffeeType,
            String size,
            int quantity,
            List<String> customizations,
            int unitPrice,
            int surcharge,
            int lineTotal
    ) {
    }

    public static OrderResponse from(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(OrderResponse::toItemResponse)
                .toList();

        return new OrderResponse(
                order.getOrderId(),
                order.getTableNumber(),
                order.getStatus().name(),
                order.getTotalAmount(),
                order.getCashReceived(),
                order.getChangeGiven(),
                order.getPlacedAt(),
                order.getConfirmedAt(),
                order.getPaidAt(),
                order.getDeliveredAt(),
                order.getCompletedAt(),
                items
        );
    }

    private static OrderItemResponse toItemResponse(OrderItem item) {
        List<String> customizations = item.getCustomizations() == null || item.getCustomizations().isBlank()
                ? Collections.emptyList()
                : Arrays.asList(item.getCustomizations().split(","));

        return new OrderItemResponse(
                item.getItemId(),
                item.getCoffeeType().name(),
                item.getSize().name(),
                item.getQuantity(),
                customizations,
                item.getUnitPrice(),
                item.getSurcharge(),
                item.getLineTotal()
        );
    }
}
