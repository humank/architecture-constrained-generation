package com.coffeeshop.preparation.domain.event;

import com.coffeeshop.preparation.domain.model.Ingredient;
import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PreparationStarted(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        UUID itemId,
        List<Ingredient> recipe
) implements DomainEvent {
}
