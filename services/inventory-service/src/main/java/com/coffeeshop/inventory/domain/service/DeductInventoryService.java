package com.coffeeshop.inventory.domain.service;

import com.coffeeshop.inventory.domain.model.Ingredient;
import com.coffeeshop.inventory.domain.model.InventoryItem;
import com.coffeeshop.inventory.infrastructure.messaging.InventoryEventPublisher;
import com.coffeeshop.inventory.infrastructure.persistence.InventoryItemRepository;
import com.coffeeshop.shared.domain.DomainEvent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class DeductInventoryService {

    private static final Logger log = LoggerFactory.getLogger(DeductInventoryService.class);

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryEventPublisher eventPublisher;

    public DeductInventoryService(InventoryItemRepository inventoryItemRepository,
                                  InventoryEventPublisher eventPublisher) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.eventPublisher = eventPublisher;
    }

    public void deductForPreparation(List<Ingredient> ingredients) {
        List<DomainEvent> allEvents = new ArrayList<>();

        for (Ingredient ingredient : ingredients) {
            InventoryItem item = inventoryItemRepository.findById(ingredient.material())
                    .orElseThrow(() -> {
                        log.error("Material not found in inventory: {}. Message will go to DLQ.",
                                ingredient.material());
                        return new IllegalArgumentException(
                                "Material not found: " + ingredient.material());
                    });

            List<DomainEvent> events = item.deduct(ingredient.quantity());
            inventoryItemRepository.save(item);
            allEvents.addAll(events);
        }

        for (DomainEvent event : allEvents) {
            eventPublisher.publish(event);
        }
    }
}
