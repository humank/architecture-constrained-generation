package com.coffeeshop.reporting.api.dto;

import java.time.LocalDateTime;

public record InventoryReportResponse(
        String material,
        double quantityDeducted,
        double remainingLevel,
        double maxCapacity,
        double percentageRemaining,
        LocalDateTime recordedAt
) {
}
