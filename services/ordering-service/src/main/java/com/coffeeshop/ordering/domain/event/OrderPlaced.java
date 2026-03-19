package com.coffeeshop.ordering.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderPlaced(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        int tableNumber,
        int totalAmount
) implements DomainEvent {
}
