package com.coffeeshop.preparation.infrastructure.messaging;

import com.coffeeshop.preparation.infrastructure.persistence.OutboxEntry;
import com.coffeeshop.preparation.infrastructure.persistence.OutboxRepository;
import com.coffeeshop.shared.domain.DomainEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class PreparationEventPublisher {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    public PreparationEventPublisher(OutboxRepository outboxRepository, ObjectMapper objectMapper) {
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
    }

    public void publish(DomainEvent event) {
        String eventType = event.getClass().getSimpleName();
        String payload;
        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize event: " + eventType, e);
        }

        OutboxEntry entry = new OutboxEntry(
                UUID.randomUUID(),
                event.eventId(),
                eventType,
                payload,
                LocalDateTime.now()
        );

        outboxRepository.save(entry);
    }
}
