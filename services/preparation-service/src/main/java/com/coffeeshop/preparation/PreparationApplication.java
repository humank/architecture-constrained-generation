package com.coffeeshop.preparation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PreparationApplication {

    public static void main(String[] args) {
        SpringApplication.run(PreparationApplication.class, args);
    }
}
