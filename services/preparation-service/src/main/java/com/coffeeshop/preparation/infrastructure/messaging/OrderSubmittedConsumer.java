package com.coffeeshop.preparation.infrastructure.messaging;

import com.coffeeshop.preparation.application.OrderSubmittedHandler;
import com.fasterxml.jackson.core.type.TypeReference;
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

import java.util.List;
import java.util.Map;

@Component
public class OrderSubmittedConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderSubmittedConsumer.class);

    private final SqsClient sqsClient;
    private final String queueUrl;
    private final ObjectMapper objectMapper;
    private final OrderSubmittedHandler orderSubmittedHandler;

    public OrderSubmittedConsumer(SqsClient sqsClient,
                                  @Value("${aws.sqs.preparation-from-ordering-queue-url}") String queueUrl,
                                  ObjectMapper objectMapper,
                                  OrderSubmittedHandler orderSubmittedHandler) {
        this.sqsClient = sqsClient;
        this.queueUrl = queueUrl;
        this.objectMapper = objectMapper;
        this.orderSubmittedHandler = orderSubmittedHandler;
    }

    @Scheduled(fixedDelay = 1000)
    public void pollMessages() {
        ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(10)
                .waitTimeSeconds(5)
                .build();

        List<Message> messages = sqsClient.receiveMessage(receiveRequest).messages();

        for (Message message : messages) {
            try {
                Map<String, Object> snsWrapper = objectMapper.readValue(
                        message.body(), new TypeReference<>() {});

                String eventPayload = (String) snsWrapper.get("Message");
                Map<String, Object> eventData = objectMapper.readValue(
                        eventPayload, new TypeReference<>() {});

                orderSubmittedHandler.handle(eventData);

                sqsClient.deleteMessage(DeleteMessageRequest.builder()
                        .queueUrl(queueUrl)
                        .receiptHandle(message.receiptHandle())
                        .build());

                log.info("Processed OrderSubmittedToBarista message: {}", message.messageId());
            } catch (Exception e) {
                log.error("Failed to process SQS message {}: {}", message.messageId(), e.getMessage(), e);
            }
        }
    }
}
