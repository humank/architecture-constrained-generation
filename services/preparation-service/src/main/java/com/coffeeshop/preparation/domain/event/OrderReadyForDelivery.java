package com.coffeeshop.preparation.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderReadyForDelivery(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        int tableNumber,
        LocalDateTime readyAt
) implements DomainEvent {
}
