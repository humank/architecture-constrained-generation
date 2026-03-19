package com.coffeeshop.ordering.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderCompleted(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        int tableNumber,
        List<ItemSummary> items,
        int total,
        LocalDateTime placedAt,
        LocalDateTime completedAt
) implements DomainEvent {

    public record ItemSummary(
            String coffeeType,
            String size,
            int quantity,
            int unitPrice,
            List<String> customizations
    ) {
    }
}
