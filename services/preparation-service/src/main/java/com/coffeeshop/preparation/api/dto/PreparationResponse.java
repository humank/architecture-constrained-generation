package com.coffeeshop.preparation.api.dto;

import com.coffeeshop.preparation.domain.model.Preparation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PreparationResponse(
        UUID preparationId,
        UUID orderId,
        int tableNumber,
        String status,
        List<PreparationItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime completedAt
) {
    public static PreparationResponse from(Preparation preparation) {
        return new PreparationResponse(
                preparation.getPreparationId(),
                preparation.getOrderId(),
                preparation.getTableNumber(),
                preparation.getStatus().name(),
                preparation.getItems().stream()
                        .map(PreparationItemResponse::from)
                        .toList(),
                preparation.getCreatedAt(),
                preparation.getCompletedAt()
        );
    }
}
