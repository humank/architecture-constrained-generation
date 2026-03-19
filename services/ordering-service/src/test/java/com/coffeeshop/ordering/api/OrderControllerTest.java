package com.coffeeshop.ordering.api;

import com.coffeeshop.ordering.application.OrderService;
import com.coffeeshop.ordering.domain.model.Order;
import com.coffeeshop.ordering.domain.model.OrderStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @Autowired
    private ObjectMapper objectMapper;

    @Nested
    @DisplayName("GET /api/orders?status=...")
    class GetOrdersByStatus {

        @Test
        @DisplayName("?status=active returns active orders (semantic filter)")
        void activeSemanticFilter() throws Exception {
            when(orderService.getActiveOrders()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "active"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("application/json"))
                    .andExpect(jsonPath("$", isA(List.class)));
        }

        @Test
        @DisplayName("?status=Active is case-insensitive (semantic filter)")
        void activeCaseInsensitive() throws Exception {
            when(orderService.getActiveOrders()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "Active"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("?status=ACTIVE is case-insensitive (semantic filter)")
        void activeUpperCase() throws Exception {
            when(orderService.getActiveOrders()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "ACTIVE"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("?status=Placed returns placed orders (enum literal)")
        void placedEnumLiteral() throws Exception {
            when(orderService.getOrdersByStatus(OrderStatus.PLACED)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "Placed"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("application/json"));
        }

        @Test
        @DisplayName("?status=Confirmed returns confirmed orders (enum literal)")
        void confirmedEnumLiteral() throws Exception {
            when(orderService.getOrdersByStatus(OrderStatus.CONFIRMED)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "Confirmed"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("?status=Ready returns ready orders (enum literal)")
        void readyEnumLiteral() throws Exception {
            when(orderService.getOrdersByStatus(OrderStatus.READY)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/orders").param("status", "Ready"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("?status=INVALID returns 400 (not 500)")
        void invalidStatusReturns400() throws Exception {
            mockMvc.perform(get("/api/orders").param("status", "INVALID"))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentType("application/json"))
                    .andExpect(jsonPath("$.message").exists());
        }

        @Test
        @DisplayName("no status param returns empty list")
        void noStatusReturnsEmpty() throws Exception {
            mockMvc.perform(get("/api/orders"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }
}
