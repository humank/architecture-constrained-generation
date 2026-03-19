package com.coffeeshop.reporting.application;

import com.coffeeshop.reporting.domain.model.InventoryProjection;
import com.coffeeshop.reporting.infrastructure.persistence.InventoryProjectionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class IngredientDeductedHandler {

    private static final Logger log = LoggerFactory.getLogger(IngredientDeductedHandler.class);

    private final InventoryProjectionRepository inventoryProjectionRepository;
    private final ObjectMapper objectMapper;

    public IngredientDeductedHandler(InventoryProjectionRepository inventoryProjectionRepository,
                                      ObjectMapper objectMapper) {
        this.inventoryProjectionRepository = inventoryProjectionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void handle(String messageBody) {
        try {
            JsonNode root = objectMapper.readTree(messageBody);

            // SNS wraps the message
            JsonNode messageNode = root;
            if (root.has("Message")) {
                messageNode = objectMapper.readTree(root.get("Message").asText());
            }

            String material = messageNode.get("material").asText();
            double quantityDeducted = messageNode.get("quantityDeducted").asDouble();
            double remainingLevel = messageNode.get("remainingLevel").asDouble();
            double maxCapacity = messageNode.get("maxCapacity").asDouble();
            double percentageRemaining = messageNode.get("percentageRemaining").asDouble();

            InventoryProjection projection = new InventoryProjection(
                    UUID.randomUUID(),
                    material,
                    quantityDeducted,
                    remainingLevel,
                    maxCapacity,
                    percentageRemaining,
                    LocalDateTime.now()
            );

            inventoryProjectionRepository.save(projection);
            log.info("Created InventoryProjection for material: {}", material);
        } catch (Exception e) {
            log.error("Failed to handle IngredientDeducted message: {}", messageBody, e);
            throw new RuntimeException("Failed to process IngredientDeducted", e);
        }
    }
}
