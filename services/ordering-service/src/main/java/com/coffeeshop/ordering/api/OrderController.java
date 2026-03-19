package com.coffeeshop.ordering.api;

import com.coffeeshop.ordering.api.dto.*;
import com.coffeeshop.ordering.application.OrderService;
import com.coffeeshop.ordering.domain.model.Order;
import com.coffeeshop.ordering.domain.model.OrderStatus;
import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import com.coffeeshop.shared.domain.Customization;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<PlaceOrderResponse> placeOrder(@RequestBody PlaceOrderRequest request) {
        List<Order.ItemRequest> items = request.items().stream()
                .map(this::toItemRequest)
                .toList();

        Order order = orderService.placeOrder(request.tableNumber(), items);

        return ResponseEntity.status(HttpStatus.CREATED).body(new PlaceOrderResponse(
                order.getOrderId(),
                order.getTotalAmount(),
                order.getStatus().name()
        ));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(
            @RequestParam(value = "status", required = false) String status) {
        List<Order> orders;
        if (status != null && !status.isBlank()) {
            OrderStatus orderStatus = OrderStatus.valueOf(status.toUpperCase());
            orders = orderService.getOrdersByStatus(orderStatus);
        } else {
            orders = Collections.emptyList();
        }
        List<OrderResponse> response = orders.stream()
                .map(OrderResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable UUID orderId) {
        Order order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PatchMapping("/{orderId}/confirm")
    public ResponseEntity<OrderResponse> confirmOrder(@PathVariable UUID orderId) {
        Order order = orderService.confirmOrder(orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PostMapping("/{orderId}/pay")
    public ResponseEntity<OrderResponse> processPayment(
            @PathVariable UUID orderId,
            @RequestBody ProcessPaymentRequest request) {
        Order order = orderService.processPayment(orderId, request.cashReceived());
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PatchMapping("/{orderId}/deliver")
    public ResponseEntity<OrderResponse> deliverOrder(@PathVariable UUID orderId) {
        Order order = orderService.deliverOrder(orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    @PatchMapping("/{orderId}/complete")
    public ResponseEntity<OrderResponse> completeOrder(@PathVariable UUID orderId) {
        Order order = orderService.completeOrder(orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }

    private Order.ItemRequest toItemRequest(PlaceOrderRequest.OrderItemRequest dto) {
        CoffeeType coffeeType = CoffeeType.valueOf(dto.coffeeType());
        CoffeeSize size = CoffeeSize.valueOf(dto.size());
        List<Customization> customizations = dto.customizations() == null
                ? Collections.emptyList()
                : dto.customizations().stream()
                .map(Customization::valueOf)
                .toList();

        return new Order.ItemRequest(coffeeType, size, dto.quantity(), customizations);
    }
}
