package com.coffeeshop.preparation.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record CoffeePrepared(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        UUID itemId
) implements DomainEvent {
}
