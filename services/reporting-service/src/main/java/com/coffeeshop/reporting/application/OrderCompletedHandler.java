package com.coffeeshop.reporting.application;

import com.coffeeshop.reporting.domain.model.SalesProjection;
import com.coffeeshop.reporting.infrastructure.persistence.SalesProjectionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class OrderCompletedHandler {

    private static final Logger log = LoggerFactory.getLogger(OrderCompletedHandler.class);

    private final SalesProjectionRepository salesProjectionRepository;
    private final ObjectMapper objectMapper;

    public OrderCompletedHandler(SalesProjectionRepository salesProjectionRepository,
                                  ObjectMapper objectMapper) {
        this.salesProjectionRepository = salesProjectionRepository;
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

            UUID orderId = UUID.fromString(messageNode.get("orderId").asText());

            // Idempotency: skip duplicate orderId
            if (salesProjectionRepository.existsByOrderId(orderId)) {
                log.info("Skipping duplicate OrderCompleted for orderId: {}", orderId);
                return;
            }

            int tableNumber = messageNode.get("tableNumber").asInt();
            String items = messageNode.has("items") ? messageNode.get("items").toString() : "[]";
            int total = messageNode.get("total").asInt();

            LocalDateTime placedAt = messageNode.has("placedAt")
                    ? LocalDateTime.parse(messageNode.get("placedAt").asText())
                    : null;
            LocalDateTime completedAt = messageNode.has("completedAt")
                    ? LocalDateTime.parse(messageNode.get("completedAt").asText())
                    : null;

            SalesProjection projection = new SalesProjection(
                    UUID.randomUUID(),
                    orderId,
                    tableNumber,
                    items,
                    total,
                    placedAt,
                    completedAt
            );

            salesProjectionRepository.save(projection);
            log.info("Created SalesProjection for orderId: {}", orderId);
        } catch (Exception e) {
            log.error("Failed to handle OrderCompleted message: {}", messageBody, e);
            throw new RuntimeException("Failed to process OrderCompleted", e);
        }
    }
}
