package com.coffeeshop.inventory.api.dto;

import java.time.LocalDate;

public record PurchaseOrderRequest(
        String supplier,
        LocalDate expectedDeliveryDate
) {
}
