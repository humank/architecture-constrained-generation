package com.coffeeshop.inventory.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record IngredientDeducted(
        UUID eventId,
        LocalDateTime occurredAt,
        String material,
        double quantityDeducted,
        double remainingLevel,
        double maxCapacity,
        double percentageRemaining
) implements DomainEvent {
}
