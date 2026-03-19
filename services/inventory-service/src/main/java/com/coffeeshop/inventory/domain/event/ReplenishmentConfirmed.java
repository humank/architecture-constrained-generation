package com.coffeeshop.inventory.domain.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReplenishmentConfirmed(
        UUID replenishmentId,
        String materialId,
        LocalDateTime confirmedAt
) {
}
