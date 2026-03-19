package com.coffeeshop.inventory.domain.event;

import com.coffeeshop.shared.domain.DomainEvent;

import java.time.LocalDateTime;
import java.util.UUID;

public record LowStockAlertTriggered(
        UUID eventId,
        LocalDateTime occurredAt,
        String material,
        double currentLevel,
        double threshold,
        double maxCapacity
) implements DomainEvent {
    public LowStockAlertTriggered(String material, double currentLevel, double threshold, double maxCapacity) {
        this(UUID.randomUUID(), LocalDateTime.now(), material, currentLevel, threshold, maxCapacity);
    }
}
