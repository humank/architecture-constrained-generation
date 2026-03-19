package com.coffeeshop.preparation.infrastructure.messaging;

import com.coffeeshop.preparation.infrastructure.persistence.OutboxEntry;
import com.coffeeshop.preparation.infrastructure.persistence.OutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.util.List;
import java.util.Map;

@Component
public class OutboxPoller {

    private static final Logger log = LoggerFactory.getLogger(OutboxPoller.class);

    private final OutboxRepository outboxRepository;
    private final SnsClient snsClient;
    private final String topicArn;

    public OutboxPoller(OutboxRepository outboxRepository,
                        SnsClient snsClient,
                        @Value("${aws.sns.preparation-events-topic-arn}") String topicArn) {
        this.outboxRepository = outboxRepository;
        this.snsClient = snsClient;
        this.topicArn = topicArn;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void pollAndPublish() {
        List<OutboxEntry> unpublished = outboxRepository.findByPublishedAtIsNull();

        for (OutboxEntry entry : unpublished) {
            try {
                PublishRequest request = PublishRequest.builder()
                        .topicArn(topicArn)
                        .message(entry.getPayload())
                        .messageAttributes(Map.of(
                                "eventType", MessageAttributeValue.builder()
                                        .dataType("String")
                                        .stringValue(entry.getEventType())
                                        .build()
                        ))
                        .build();

                snsClient.publish(request);
                entry.markPublished();
                outboxRepository.save(entry);

                log.info("Published outbox entry {} (type={})", entry.getId(), entry.getEventType());
            } catch (Exception e) {
                log.error("Failed to publish outbox entry {}: {}", entry.getId(), e.getMessage());
            }
        }
    }
}
