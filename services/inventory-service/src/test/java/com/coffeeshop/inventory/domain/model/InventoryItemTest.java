package com.coffeeshop.inventory.domain.model;

import com.coffeeshop.inventory.domain.event.IngredientDeducted;
import com.coffeeshop.inventory.domain.event.LowStockAlertTriggered;
import com.coffeeshop.shared.domain.DomainEvent;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class InventoryItemTest {

    private InventoryItem item;

    @BeforeEach
    void setUp() {
        item = new InventoryItem("espresso-beans", "Espresso Beans", 1000.0, 1000.0, "g");
    }

    @Test
    void deduct_fromFullStock_reducesCurrentLevelAndProducesIngredientDeductedEvent() {
        List<DomainEvent> events = item.deduct(200.0);

        assertThat(item.getCurrentLevel()).isCloseTo(800.0, within(0.001));
        assertThat(events).hasSize(1);
        assertThat(events.get(0)).isInstanceOf(IngredientDeducted.class);

        IngredientDeducted deducted = (IngredientDeducted) events.get(0);
        assertThat(deducted.eventId()).isNotNull();
        assertThat(deducted.occurredAt()).isNotNull();
        assertThat(deducted.material()).isEqualTo("espresso-beans");
        assertThat(deducted.quantityDeducted()).isCloseTo(200.0, within(0.001));
        assertThat(deducted.remainingLevel()).isCloseTo(800.0, within(0.001));
        assertThat(deducted.maxCapacity()).isCloseTo(1000.0, within(0.001));
        // getPercentage returns (currentLevel / maxCapacity) * 100
        assertThat(deducted.percentageRemaining()).isCloseTo(80.0, within(0.001));
    }

    @Test
    void deduct_belowAlertThreshold_triggersLowStockAlertEvent() {
        // Deduct enough to go below 30% (i.e., below 300 out of 1000)
        List<DomainEvent> events = item.deduct(750.0);

        assertThat(item.getCurrentLevel()).isCloseTo(250.0, within(0.001));
        assertThat(events).hasSize(2);
        assertThat(events.get(0)).isInstanceOf(IngredientDeducted.class);
        assertThat(events.get(1)).isInstanceOf(LowStockAlertTriggered.class);

        LowStockAlertTriggered alert = (LowStockAlertTriggered) events.get(1);
        assertThat(alert.eventId()).isNotNull();
        assertThat(alert.occurredAt()).isNotNull();
        assertThat(alert.material()).isEqualTo("espresso-beans");
        assertThat(alert.currentLevel()).isCloseTo(250.0, within(0.001));
        assertThat(alert.threshold()).isCloseTo(0.3, within(0.001));
        assertThat(alert.maxCapacity()).isCloseTo(1000.0, within(0.001));

        assertThat(item.isAlertTriggered()).isTrue();
    }

    @Test
    void deduct_alertOnlyFiresOnce_whenAlreadyTriggered() {
        // First deduction below threshold triggers the alert
        item.deduct(750.0);
        assertThat(item.isAlertTriggered()).isTrue();

        item.clearDomainEvents();

        // Second deduction still below threshold but alert should NOT fire again
        List<DomainEvent> events = item.deduct(50.0);

        assertThat(item.getCurrentLevel()).isCloseTo(200.0, within(0.001));
        assertThat(events).hasSize(1);
        assertThat(events.get(0)).isInstanceOf(IngredientDeducted.class);
    }

    @Test
    void deduct_insufficientStock_throwsIllegalStateException() {
        assertThatThrownBy(() -> item.deduct(1500.0))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Insufficient stock")
                .hasMessageContaining("espresso-beans");
    }

    @Test
    void deduct_exactlyAvailableStock_doesNotThrow() {
        List<DomainEvent> events = item.deduct(1000.0);

        assertThat(item.getCurrentLevel()).isCloseTo(0.0, within(0.001));
        assertThat(events).isNotEmpty();
    }

    @Test
    void restore_resetsCurrentLevelToMaxCapacityAndClearsAlert() {
        item.deduct(800.0);
        assertThat(item.isAlertTriggered()).isTrue();
        assertThat(item.getCurrentLevel()).isCloseTo(200.0, within(0.001));

        item.restore();

        assertThat(item.getCurrentLevel()).isCloseTo(1000.0, within(0.001));
        assertThat(item.isAlertTriggered()).isFalse();
        assertThat(item.getLastUpdated()).isNotNull();
    }

    @Test
    void getPercentage_calculatesCorrectly() {
        assertThat(item.getPercentage()).isCloseTo(100.0, within(0.001));

        item.deduct(500.0);
        assertThat(item.getPercentage()).isCloseTo(50.0, within(0.001));

        item.deduct(400.0);
        assertThat(item.getPercentage()).isCloseTo(10.0, within(0.001));
    }

    @Test
    void getPercentage_zeroMaxCapacity_returnsZero() {
        InventoryItem zeroCapacity = new InventoryItem("water", "Water", 0.0, 0.0, "ml");
        assertThat(zeroCapacity.getPercentage()).isCloseTo(0.0, within(0.001));
    }

    @Test
    void getDomainEvents_returnsAccumulatedEvents() {
        item.deduct(100.0);
        item.deduct(100.0);

        List<DomainEvent> events = item.getDomainEvents();
        assertThat(events).hasSize(2);
    }

    @Test
    void clearDomainEvents_removesAllAccumulatedEvents() {
        item.deduct(100.0);
        assertThat(item.getDomainEvents()).isNotEmpty();

        item.clearDomainEvents();
        assertThat(item.getDomainEvents()).isEmpty();
    }

    @Test
    void getDomainEvents_returnsUnmodifiableCopy() {
        item.deduct(100.0);
        List<DomainEvent> events = item.getDomainEvents();

        assertThatThrownBy(() -> events.add(null))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
