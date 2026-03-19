package com.coffeeshop.inventory.infrastructure.messaging;

import com.coffeeshop.inventory.domain.event.IngredientDeducted;
import com.coffeeshop.inventory.domain.event.LowStockAlertTriggered;
import com.coffeeshop.shared.domain.DomainEvent;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.util.Map;

@Component
public class InventoryEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(InventoryEventPublisher.class);

    private final SnsClient snsClient;
    private final ObjectMapper objectMapper;
    private final String topicArn;

    public InventoryEventPublisher(SnsClient snsClient,
                                   ObjectMapper objectMapper,
                                   @Value("${aws.sns.inventory-events-topic-arn}") String topicArn) {
        this.snsClient = snsClient;
        this.objectMapper = objectMapper;
        this.topicArn = topicArn;
    }

    public void publish(DomainEvent event) {
        try {
            String eventType = resolveEventType(event);
            String message = objectMapper.writeValueAsString(event);

            PublishRequest request = PublishRequest.builder()
                    .topicArn(topicArn)
                    .message(message)
                    .messageAttributes(Map.of(
                            "eventType", MessageAttributeValue.builder()
                                    .dataType("String")
                                    .stringValue(eventType)
                                    .build()
                    ))
                    .build();

            snsClient.publish(request);
            log.info("Published {} to inventory-events topic", eventType);
        } catch (Exception e) {
            log.error("Failed to publish event: {}", event, e);
            throw new RuntimeException("Failed to publish event", e);
        }
    }

    private String resolveEventType(DomainEvent event) {
        if (event instanceof IngredientDeducted) return "IngredientDeducted";
        if (event instanceof LowStockAlertTriggered) return "LowStockAlertTriggered";
        return event.getClass().getSimpleName();
    }
}
