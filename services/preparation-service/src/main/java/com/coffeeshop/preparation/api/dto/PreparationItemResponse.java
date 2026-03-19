package com.coffeeshop.preparation.api.dto;

import com.coffeeshop.preparation.domain.model.PreparationItem;

import java.time.LocalDateTime;
import java.util.UUID;

public record PreparationItemResponse(
        UUID itemId,
        String coffeeType,
        String size,
        String customizations,
        String status,
        LocalDateTime startedAt,
        LocalDateTime completedAt
) {
    public static PreparationItemResponse from(PreparationItem item) {
        return new PreparationItemResponse(
                item.getItemId(),
                item.getCoffeeType().name(),
                item.getSize().name(),
                item.getCustomizations(),
                item.getStatus().name(),
                item.getStartedAt(),
                item.getCompletedAt()
        );
    }
}
