package com.coffeeshop.ordering.infrastructure.messaging;

import com.coffeeshop.ordering.application.OrderReadyEventHandler;
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
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.util.UUID;

@Component
public class OrderReadyConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderReadyConsumer.class);

    private final SqsClient sqsClient;
    private final ObjectMapper objectMapper;
    private final OrderReadyEventHandler eventHandler;
    private final String queueUrl;

    public OrderReadyConsumer(
            SqsClient sqsClient,
            ObjectMapper objectMapper,
            OrderReadyEventHandler eventHandler,
            @Value("${app.messaging.sqs.ordering-from-preparation-queue-url}") String queueUrl) {
        this.sqsClient = sqsClient;
        this.objectMapper = objectMapper;
        this.eventHandler = eventHandler;
        this.queueUrl = queueUrl;
    }

    @Scheduled(fixedDelayString = "${app.messaging.sqs.poll-interval-ms:5000}")
    public void pollMessages() {
        try {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                    .queueUrl(queueUrl)
                    .maxNumberOfMessages(10)
                    .waitTimeSeconds(10)
                    .build();

            ReceiveMessageResponse response = sqsClient.receiveMessage(request);

            for (Message message : response.messages()) {
                try {
                    processMessage(message);
                    deleteMessage(message);
                } catch (Exception e) {
                    log.error("Failed to process message: {}", message.messageId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error polling SQS queue", e);
        }
    }

    private void processMessage(Message message) throws Exception {
        // SNS wraps the actual message in an envelope
        JsonNode snsEnvelope = objectMapper.readTree(message.body());
        String innerMessage = snsEnvelope.has("Message")
                ? snsEnvelope.get("Message").asText()
                : message.body();

        JsonNode event = objectMapper.readTree(innerMessage);
        UUID orderId = UUID.fromString(event.get("orderId").asText());

        log.info("Received OrderReadyForDelivery for order {}", orderId);
        eventHandler.handle(orderId);
    }

    private void deleteMessage(Message message) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(message.receiptHandle())
                .build());
    }
}
