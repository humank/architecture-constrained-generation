package com.coffeeshop.inventory.application;

import com.coffeeshop.inventory.domain.model.Ingredient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PreparationStartedHandler {

    private static final Logger log = LoggerFactory.getLogger(PreparationStartedHandler.class);

    private final InventoryService inventoryService;
    private final ObjectMapper objectMapper;
    private final Set<String> processedEventIds = new HashSet<>();

    public PreparationStartedHandler(InventoryService inventoryService, ObjectMapper objectMapper) {
        this.inventoryService = inventoryService;
        this.objectMapper = objectMapper;
    }

    public void handle(String messageBody) {
        try {
            JsonNode root = objectMapper.readTree(messageBody);

            // SNS wraps the message — extract the actual Message field
            JsonNode messageNode = root;
            if (root.has("Message")) {
                messageNode = objectMapper.readTree(root.get("Message").asText());
            }

            // Idempotency check
            String eventId = messageNode.has("eventId") ? messageNode.get("eventId").asText() : null;
            if (eventId != null && processedEventIds.contains(eventId)) {
                log.info("Skipping already-processed PreparationStarted event: {}", eventId);
                return;
            }

            JsonNode recipeNode = messageNode.get("recipe");
            if (recipeNode == null || !recipeNode.has("ingredients")) {
                log.warn("PreparationStarted message has no recipe/ingredients: {}", messageBody);
                return;
            }

            JsonNode ingredientsNode = recipeNode.get("ingredients");
            List<Ingredient> ingredients = new ArrayList<>();
            for (JsonNode ing : ingredientsNode) {
                ingredients.add(new Ingredient(
                        ing.get("material").asText(),
                        ing.get("quantity").asDouble(),
                        ing.get("unit").asText()
                ));
            }

            inventoryService.deductForPreparation(ingredients);

            if (eventId != null) {
                processedEventIds.add(eventId);
            }

            log.info("Processed PreparationStarted event, deducted {} ingredients", ingredients.size());
        } catch (Exception e) {
            log.error("Failed to handle PreparationStarted message: {}", messageBody, e);
            throw new RuntimeException("Failed to process PreparationStarted", e);
        }
    }
}
