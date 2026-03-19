package com.coffeeshop.ordering.domain.model;

import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import com.coffeeshop.shared.domain.Customization;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderTest {

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static Order.ItemRequest espressoSingle() {
        return new Order.ItemRequest(CoffeeType.Espresso, CoffeeSize.Single, 1, List.of());
    }

    private static Order.ItemRequest latteGrande() {
        return new Order.ItemRequest(CoffeeType.Latte, CoffeeSize.Grande, 1, List.of());
    }

    private static Order.ItemRequest cappuccinoTallWithWhippedCream() {
        return new Order.ItemRequest(CoffeeType.Cappuccino, CoffeeSize.Tall, 1,
                List.of(Customization.WhippedCream));
    }

    // ---------------------------------------------------------------------------
    // Happy path & state machine
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("Happy path - full state machine")
    class HappyPath {

        @Test
        @DisplayName("placeOrder creates order in PLACED status with correct total")
        void placeOrder_createsOrderInPlacedStatus() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));

            assertThat(order.getOrderId()).isNotNull();
            assertThat(order.getTableNumber()).isEqualTo(1);
            assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
            assertThat(order.getTotalAmount()).isEqualTo(60);
            assertThat(order.getPlacedAt()).isNotNull();
            assertThat(order.getItems()).hasSize(1);
        }

        @Test
        @DisplayName("full lifecycle: PLACED -> CONFIRMED -> PAID -> READY -> DELIVERED -> COMPLETED")
        void fullLifecycle() {
            Order order = Order.placeOrder(3, List.of(espressoSingle()));

            order.confirm();
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
            assertThat(order.getConfirmedAt()).isNotNull();

            order.processPayment(100);
            assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
            assertThat(order.getPaidAt()).isNotNull();
            assertThat(order.getCashReceived()).isEqualTo(100);
            assertThat(order.getChangeGiven()).isEqualTo(40);

            order.markReady();
            assertThat(order.getStatus()).isEqualTo(OrderStatus.READY);

            order.deliver();
            assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
            assertThat(order.getDeliveredAt()).isNotNull();

            order.complete();
            assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
            assertThat(order.getCompletedAt()).isNotNull();
        }
    }

    // ---------------------------------------------------------------------------
    // Pricing
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("Pricing calculation")
    class Pricing {

        @Test
        @DisplayName("Espresso Single = 60")
        void espressoSinglePrice() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));
            assertThat(order.getTotalAmount()).isEqualTo(60);
        }

        @Test
        @DisplayName("Latte Grande = 140")
        void latteGrandePrice() {
            Order order = Order.placeOrder(1, List.of(latteGrande()));
            assertThat(order.getTotalAmount()).isEqualTo(140);
        }

        @Test
        @DisplayName("Cappuccino Tall with WhippedCream = 120 + 20 surcharge = 140")
        void cappuccinoWithWhippedCreamSurcharge() {
            Order order = Order.placeOrder(1, List.of(cappuccinoTallWithWhippedCream()));
            assertThat(order.getTotalAmount()).isEqualTo(140);

            OrderItem item = order.getItems().get(0);
            assertThat(item.getUnitPrice()).isEqualTo(120);
            assertThat(item.getSurcharge()).isEqualTo(20);
            assertThat(item.getLineTotal()).isEqualTo(140);
        }

        @Test
        @DisplayName("Multiple items summed correctly")
        void multipleItemsTotal() {
            // Espresso Single (60) + Latte Grande (140) = 200
            Order order = Order.placeOrder(2, List.of(espressoSingle(), latteGrande()));
            assertThat(order.getTotalAmount()).isEqualTo(200);
        }

        @Test
        @DisplayName("Quantity multiplies line total: 2x Espresso Single = 120")
        void quantityMultipliesLineTotal() {
            Order.ItemRequest twoEspressos = new Order.ItemRequest(
                    CoffeeType.Espresso, CoffeeSize.Single, 2, List.of());
            Order order = Order.placeOrder(1, List.of(twoEspressos));

            assertThat(order.getTotalAmount()).isEqualTo(120);
            assertThat(order.getItems().get(0).getLineTotal()).isEqualTo(120);
        }

        @Test
        @DisplayName("Quantity with surcharge: 2x Cappuccino Tall + WhippedCream = (120+20)*2 = 280")
        void quantityWithSurcharge() {
            Order.ItemRequest req = new Order.ItemRequest(
                    CoffeeType.Cappuccino, CoffeeSize.Tall, 2,
                    List.of(Customization.WhippedCream));
            Order order = Order.placeOrder(1, List.of(req));

            assertThat(order.getTotalAmount()).isEqualTo(280);
        }
    }

    // ---------------------------------------------------------------------------
    // Invalid state transitions
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("Invalid state transitions")
    class InvalidTransitions {

        @Test
        @DisplayName("confirm throws when not PLACED")
        void confirmWhenNotPlaced() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));
            order.confirm();

            assertThatThrownBy(order::confirm)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("expected PLACED");
        }

        @Test
        @DisplayName("processPayment throws when not CONFIRMED")
        void payWhenNotConfirmed() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));

            assertThatThrownBy(() -> order.processPayment(100))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("expected CONFIRMED");
        }

        @Test
        @DisplayName("markReady throws when not PAID")
        void markReadyWhenNotPaid() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));

            assertThatThrownBy(order::markReady)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("expected PAID");
        }

        @Test
        @DisplayName("deliver throws when not READY")
        void deliverWhenNotReady() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));

            assertThatThrownBy(order::deliver)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("expected READY");
        }

        @Test
        @DisplayName("complete throws when not DELIVERED")
        void completeWhenNotDelivered() {
            Order order = Order.placeOrder(1, List.of(espressoSingle()));

            assertThatThrownBy(order::complete)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("expected DELIVERED");
        }
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("Validation on placeOrder")
    class Validation {

        @Test
        @DisplayName("table number 0 is rejected")
        void tableNumberZero() {
            assertThatThrownBy(() -> Order.placeOrder(0, List.of(espressoSingle())))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Table number must be between 1 and 5");
        }

        @Test
        @DisplayName("table number 6 is rejected")
        void tableNumberSix() {
            assertThatThrownBy(() -> Order.placeOrder(6, List.of(espressoSingle())))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Table number must be between 1 and 5");
        }

        @Test
        @DisplayName("empty items list is rejected")
        void emptyItems() {
            assertThatThrownBy(() -> Order.placeOrder(1, List.of()))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("at least one item");
        }

        @Test
        @DisplayName("null items list is rejected")
        void nullItems() {
            assertThatThrownBy(() -> Order.placeOrder(1, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("at least one item");
        }

        @Test
        @DisplayName("quantity 0 is rejected")
        void quantityZero() {
            Order.ItemRequest req = new Order.ItemRequest(
                    CoffeeType.Espresso, CoffeeSize.Single, 0, List.of());

            assertThatThrownBy(() -> Order.placeOrder(1, List.of(req)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Quantity must be at least 1");
        }

        @Test
        @DisplayName("invalid size for type: Single for Latte is rejected")
        void invalidSizeForType() {
            Order.ItemRequest req = new Order.ItemRequest(
                    CoffeeType.Latte, CoffeeSize.Single, 1, List.of());

            assertThatThrownBy(() -> Order.placeOrder(1, List.of(req)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not valid for");
        }

        @Test
        @DisplayName("invalid customization for type: DryFoam for Espresso is rejected")
        void invalidCustomizationForType() {
            Order.ItemRequest req = new Order.ItemRequest(
                    CoffeeType.Espresso, CoffeeSize.Single, 1,
                    List.of(Customization.DryFoam));

            assertThatThrownBy(() -> Order.placeOrder(1, List.of(req)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not valid for");
        }
    }

    // ---------------------------------------------------------------------------
    // Payment
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("Payment processing")
    class Payment {

        @Test
        @DisplayName("exact cash - zero change")
        void exactCash() {
            Order order = Order.placeOrder(1, List.of(espressoSingle())); // total = 60
            order.confirm();
            order.processPayment(60);

            assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
            assertThat(order.getCashReceived()).isEqualTo(60);
            assertThat(order.getChangeGiven()).isEqualTo(0);
        }

        @Test
        @DisplayName("overpayment - correct change calculated")
        void overpayment() {
            Order order = Order.placeOrder(1, List.of(espressoSingle())); // total = 60
            order.confirm();
            order.processPayment(100);

            assertThat(order.getCashReceived()).isEqualTo(100);
            assertThat(order.getChangeGiven()).isEqualTo(40);
        }

        @Test
        @DisplayName("insufficient cash throws")
        void insufficientCash() {
            Order order = Order.placeOrder(1, List.of(espressoSingle())); // total = 60
            order.confirm();

            assertThatThrownBy(() -> order.processPayment(50))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("less than total amount");
        }
    }
}
