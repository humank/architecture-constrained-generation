package com.coffeeshop.inventory.domain.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReplenishmentRequested(
        UUID replenishmentId,
        String materialId,
        LocalDateTime requestedAt
) {
}
