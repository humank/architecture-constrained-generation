package com.coffeeshop.ordering.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
public class AwsConfig {

    private static final Region REGION = Region.of("us-east-1");

    @Bean
    public SnsClient snsClient() {
        return SnsClient.builder()
                .region(REGION)
                .build();
    }

    @Bean
    public SqsClient sqsClient() {
        return SqsClient.builder()
                .region(REGION)
                .build();
    }
}
