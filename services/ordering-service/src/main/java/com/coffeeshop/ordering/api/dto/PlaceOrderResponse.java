package com.coffeeshop.ordering.api.dto;

import java.util.UUID;

public record PlaceOrderResponse(
        UUID orderId,
        int totalAmount,
        String status
) {
}
