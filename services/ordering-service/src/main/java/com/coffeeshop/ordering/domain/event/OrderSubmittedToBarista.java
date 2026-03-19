package com.coffeeshop.ordering.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderSubmittedToBarista(
        UUID eventId,
        LocalDateTime occurredAt,
        UUID orderId,
        int tableNumber,
        List<ItemDetail> items
) implements DomainEvent {

    public record ItemDetail(
            UUID itemId,
            String coffeeType,
            String size,
            int quantity,
            List<String> customizations,
            Recipe recipe
    ) {
    }

    public record Recipe(
            List<Ingredient> ingredients
    ) {
    }

    public record Ingredient(
            String material,
            double quantity,
            String unit
    ) {
    }
}
