package com.coffeeshop.inventory.api;

import com.coffeeshop.inventory.api.dto.InventoryItemResponse;
import com.coffeeshop.inventory.api.dto.PurchaseOrderRequest;
import com.coffeeshop.inventory.api.dto.ReplenishmentResponse;
import com.coffeeshop.inventory.application.InventoryService;
import com.coffeeshop.inventory.domain.model.InventoryItem;
import com.coffeeshop.inventory.domain.model.Replenishment;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    public ResponseEntity<List<InventoryItemResponse>> getAllItems() {
        List<InventoryItemResponse> items = inventoryService.getAllItems().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{materialId}")
    public ResponseEntity<InventoryItemResponse> getItem(@PathVariable String materialId) {
        InventoryItem item = inventoryService.getItem(materialId);
        return ResponseEntity.ok(toResponse(item));
    }

    @PostMapping("/{materialId}/replenish")
    public ResponseEntity<ReplenishmentResponse> requestReplenishment(@PathVariable String materialId) {
        Replenishment replenishment = inventoryService.requestReplenishment(materialId);
        return ResponseEntity.ok(toReplenishmentResponse(replenishment));
    }

    @GetMapping("/replenishments")
    public ResponseEntity<List<ReplenishmentResponse>> getReplenishments() {
        List<ReplenishmentResponse> replenishments = inventoryService.getReplenishments().stream()
                .map(this::toReplenishmentResponse)
                .toList();
        return ResponseEntity.ok(replenishments);
    }

    @PostMapping("/replenishments/{id}/purchase")
    public ResponseEntity<ReplenishmentResponse> createPurchaseOrder(
            @PathVariable UUID id,
            @RequestBody PurchaseOrderRequest request) {
        Replenishment replenishment = inventoryService.createPurchaseOrder(
                id, request.supplier(), request.expectedDeliveryDate());
        return ResponseEntity.ok(toReplenishmentResponse(replenishment));
    }

    @PostMapping("/replenishments/{id}/confirm")
    public ResponseEntity<ReplenishmentResponse> confirmReplenishment(@PathVariable UUID id) {
        Replenishment replenishment = inventoryService.confirmReplenishment(id);
        return ResponseEntity.ok(toReplenishmentResponse(replenishment));
    }

    private InventoryItemResponse toResponse(InventoryItem item) {
        return new InventoryItemResponse(
                item.getMaterialId(),
                item.getMaterialName(),
                item.getCurrentLevel(),
                item.getMaxCapacity(),
                item.getUnit(),
                item.getPercentage(),
                item.isAlertTriggered()
        );
    }

    private ReplenishmentResponse toReplenishmentResponse(Replenishment r) {
        return new ReplenishmentResponse(
                r.getReplenishmentId(),
                r.getMaterialId(),
                r.getStatus().name(),
                r.getRequestedAt(),
                r.getSupplier(),
                r.getExpectedDeliveryDate(),
                r.getConfirmedAt()
        );
    }
}
