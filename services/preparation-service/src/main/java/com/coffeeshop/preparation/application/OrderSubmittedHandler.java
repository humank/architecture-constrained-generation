package com.coffeeshop.preparation.application;

import com.coffeeshop.preparation.domain.model.PreparationItem;
import com.coffeeshop.preparation.infrastructure.persistence.PreparationRepository;
import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderSubmittedHandler {

    private static final Logger log = LoggerFactory.getLogger(OrderSubmittedHandler.class);

    private final PreparationRepository preparationRepository;
    private final PreparationService preparationService;

    public OrderSubmittedHandler(PreparationRepository preparationRepository,
                                 PreparationService preparationService) {
        this.preparationRepository = preparationRepository;
        this.preparationService = preparationService;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public void handle(Map<String, Object> eventData) {
        UUID orderId = UUID.fromString((String) eventData.get("orderId"));

        // Idempotency check
        if (preparationRepository.existsByOrderId(orderId)) {
            log.info("Preparation already exists for order {}, skipping", orderId);
            return;
        }

        int tableNumber = ((Number) eventData.get("tableNumber")).intValue();
        List<Map<String, Object>> itemsData = (List<Map<String, Object>>) eventData.get("items");

        List<PreparationItem> items = itemsData.stream()
                .map(itemData -> {
                    UUID itemId = UUID.fromString((String) itemData.get("itemId"));
                    CoffeeType coffeeType = CoffeeType.valueOf((String) itemData.get("coffeeType"));
                    CoffeeSize size = CoffeeSize.valueOf((String) itemData.get("size"));
                    List<String> customizations = itemData.containsKey("customizations")
                            ? (List<String>) itemData.get("customizations")
                            : List.of();
                    String customizationsStr = String.join(",", customizations);
                    int quantity = itemData.containsKey("quantity")
                            ? ((Number) itemData.get("quantity")).intValue()
                            : 1;

                    // Create one PreparationItem per quantity unit
                    return new PreparationItem(itemId, coffeeType, size, customizationsStr);
                })
                .toList();

        preparationService.createPreparation(orderId, tableNumber, items);
        log.info("Created preparation for order {} with {} items", orderId, items.size());
    }
}
