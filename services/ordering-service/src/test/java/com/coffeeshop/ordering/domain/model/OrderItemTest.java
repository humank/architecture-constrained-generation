package com.coffeeshop.ordering.domain.model;

import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OrderItemTest {

    @Test
    @DisplayName("line total = (unitPrice + surcharge) * quantity for simple item")
    void lineTotalSimple() {
        // Espresso Single, qty 1, no surcharge
        OrderItem item = new OrderItem(
                UUID.randomUUID(),
                CoffeeType.Espresso,
                CoffeeSize.Single,
                1,
                null,
                60,   // unitPrice
                0,    // surcharge
                60    // lineTotal
        );

        assertThat(item.getLineTotal()).isEqualTo(60);
        assertThat(item.getUnitPrice()).isEqualTo(60);
        assertThat(item.getSurcharge()).isEqualTo(0);
        assertThat(item.getQuantity()).isEqualTo(1);
    }

    @Test
    @DisplayName("line total with quantity: 2x Latte Grande = 280")
    void lineTotalWithQuantity() {
        OrderItem item = new OrderItem(
                UUID.randomUUID(),
                CoffeeType.Latte,
                CoffeeSize.Grande,
                2,
                null,
                140,  // unitPrice
                0,    // surcharge
                280   // lineTotal = 140 * 2
        );

        assertThat(item.getLineTotal()).isEqualTo(280);
    }

    @Test
    @DisplayName("line total with surcharge: 1x Cappuccino Tall + WhippedCream = 140")
    void lineTotalWithSurcharge() {
        OrderItem item = new OrderItem(
                UUID.randomUUID(),
                CoffeeType.Cappuccino,
                CoffeeSize.Tall,
                1,
                "WhippedCream",
                120,  // unitPrice
                20,   // surcharge
                140   // lineTotal = (120 + 20) * 1
        );

        assertThat(item.getLineTotal()).isEqualTo(140);
        assertThat(item.getSurcharge()).isEqualTo(20);
        assertThat(item.getCustomizations()).isEqualTo("WhippedCream");
    }

    @Test
    @DisplayName("line total with quantity and surcharge: 3x Cappuccino Grande + WhippedCream = (140+20)*3 = 480")
    void lineTotalWithQuantityAndSurcharge() {
        OrderItem item = new OrderItem(
                UUID.randomUUID(),
                CoffeeType.Cappuccino,
                CoffeeSize.Grande,
                3,
                "WhippedCream",
                140,  // unitPrice
                20,   // surcharge
                480   // lineTotal = (140 + 20) * 3
        );

        assertThat(item.getLineTotal()).isEqualTo(480);
    }

    @Test
    @DisplayName("getters return all constructor values correctly")
    void gettersReturnCorrectValues() {
        UUID id = UUID.randomUUID();
        OrderItem item = new OrderItem(
                id,
                CoffeeType.Americano,
                CoffeeSize.Venti,
                2,
                "SoyMilk",
                140,
                0,
                280
        );

        assertThat(item.getItemId()).isEqualTo(id);
        assertThat(item.getCoffeeType()).isEqualTo(CoffeeType.Americano);
        assertThat(item.getSize()).isEqualTo(CoffeeSize.Venti);
        assertThat(item.getQuantity()).isEqualTo(2);
        assertThat(item.getCustomizations()).isEqualTo("SoyMilk");
        assertThat(item.getUnitPrice()).isEqualTo(140);
        assertThat(item.getSurcharge()).isEqualTo(0);
        assertThat(item.getLineTotal()).isEqualTo(280);
    }
}
