package com.coffeeshop.ordering.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentProcessed(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        int totalAmount,
        int cashReceived,
        int changeGiven
) implements DomainEvent {
}
