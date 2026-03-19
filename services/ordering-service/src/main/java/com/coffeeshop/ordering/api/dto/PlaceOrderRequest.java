package com.coffeeshop.ordering.api.dto;

import java.util.List;

public record PlaceOrderRequest(
        int tableNumber,
        List<OrderItemRequest> items
) {
    public record OrderItemRequest(
            String coffeeType,
            String size,
            int quantity,
            List<String> customizations
    ) {
    }
}
