package com.coffeeshop.inventory.api.dto;

public record InventoryItemResponse(
        String materialId,
        String materialName,
        double currentLevel,
        double maxCapacity,
        String unit,
        double percentage,
        boolean alertTriggered
) {
}
