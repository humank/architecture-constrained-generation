package com.coffeeshop.inventory.api.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ReplenishmentResponse(
        UUID replenishmentId,
        String materialId,
        String status,
        LocalDateTime requestedAt,
        String supplier,
        LocalDate expectedDeliveryDate,
        LocalDateTime confirmedAt
) {
}
