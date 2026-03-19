package com.coffeeshop.reporting.infrastructure.messaging;

import com.coffeeshop.reporting.application.IngredientDeductedHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.MessageAttributeValue;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.util.Map;

@Component
public class IngredientDeductedConsumer {

    private static final Logger log = LoggerFactory.getLogger(IngredientDeductedConsumer.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;
    private final IngredientDeductedHandler handler;
    private final String queueUrl;

    public IngredientDeductedConsumer(SqsClient sqsClient,
                                      ObjectMapper objectMapper,
                                      IngredientDeductedHandler handler,
                                      @Value("${aws.sqs.reporting-from-inventory-queue-url}") String queueUrl) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
        this.handler = handler;
        this.queueUrl = queueUrl;
    }

    @Scheduled(fixedDelay = 1000)
    public void poll() {
        try {
            ReceiveMessageResponse response = sqsClient.receiveMessage(
                    ReceiveMessageRequest.builder()
                            .queueUrl(queueUrl)
                            .maxNumberOfMessages(10)
                            .waitTimeSeconds(5)
                            .messageAttributeNames("All")
                            .build()
            );

            for (Message message : response.messages()) {
                try {
                    if (!isIngredientDeductedEvent(message)) {
                        log.debug("Skipping non-IngredientDeducted message");
                        deleteMessage(message);
                        continue;
                    }

                    handler.handle(message.body());
                    deleteMessage(message);
                } catch (Exception e) {
                    log.error("Failed to process message, will retry: {}", message.messageId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error polling SQS queue", e);
        }
    }

    private boolean isIngredientDeductedEvent(Message message) {
        Map<String, MessageAttributeValue> attrs = message.messageAttributes();
        if (attrs != null && attrs.containsKey("eventType")) {
            return "IngredientDeducted".equals(attrs.get("eventType").stringValue());
        }

        try {
            JsonNode root = objectMapper.readTree(message.body());
            if (root.has("MessageAttributes")) {
                JsonNode msgAttrs = root.get("MessageAttributes");
                if (msgAttrs.has("eventType")) {
                    String eventType = msgAttrs.get("eventType").get("Value").asText();
                    return "IngredientDeducted".equals(eventType);
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse message attributes from body", e);
        }

        return false;
    }

    private void deleteMessage(Message message) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(message.receiptHandle())
                .build());
    }
}
