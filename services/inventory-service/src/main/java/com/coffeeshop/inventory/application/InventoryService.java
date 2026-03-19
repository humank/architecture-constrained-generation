package com.coffeeshop.inventory.application;

import com.coffeeshop.inventory.domain.model.Ingredient;
import com.coffeeshop.inventory.domain.model.InventoryItem;
import com.coffeeshop.inventory.domain.model.Replenishment;
import com.coffeeshop.inventory.domain.service.DeductInventoryService;
import com.coffeeshop.inventory.infrastructure.persistence.InventoryItemRepository;
import com.coffeeshop.inventory.infrastructure.persistence.ReplenishmentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final ReplenishmentRepository replenishmentRepository;
    private final DeductInventoryService deductInventoryService;

    public InventoryService(InventoryItemRepository inventoryItemRepository,
                            ReplenishmentRepository replenishmentRepository,
                            DeductInventoryService deductInventoryService) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.replenishmentRepository = replenishmentRepository;
        this.deductInventoryService = deductInventoryService;
    }

    @Transactional(readOnly = true)
    public List<InventoryItem> getAllItems() {
        return inventoryItemRepository.findAll();
    }

    @Transactional(readOnly = true)
    public InventoryItem getItem(String materialId) {
        return inventoryItemRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Material not found: " + materialId));
    }

    public void deductForPreparation(List<Ingredient> ingredients) {
        deductInventoryService.deductForPreparation(ingredients);
    }

    public Replenishment requestReplenishment(String materialId) {
        // Verify material exists
        inventoryItemRepository.findById(materialId)
                .orElseThrow(() -> new IllegalArgumentException("Material not found: " + materialId));

        Replenishment replenishment = Replenishment.request(materialId);
        return replenishmentRepository.save(replenishment);
    }

    public Replenishment createPurchaseOrder(UUID replenishmentId, String supplier, LocalDate expectedDeliveryDate) {
        Replenishment replenishment = replenishmentRepository.findById(replenishmentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Replenishment not found: " + replenishmentId));

        replenishment.createPurchaseOrder(supplier, expectedDeliveryDate);
        return replenishmentRepository.save(replenishment);
    }

    public Replenishment confirmReplenishment(UUID replenishmentId) {
        Replenishment replenishment = replenishmentRepository.findById(replenishmentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Replenishment not found: " + replenishmentId));

        replenishment.confirmDelivery();
        replenishmentRepository.save(replenishment);

        // Restore inventory to max capacity
        InventoryItem item = inventoryItemRepository.findById(replenishment.getMaterialId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Material not found: " + replenishment.getMaterialId()));
        item.restore();
        inventoryItemRepository.save(item);

        return replenishment;
    }

    @Transactional(readOnly = true)
    public List<Replenishment> getReplenishments() {
        return replenishmentRepository.findAll();
    }
}
