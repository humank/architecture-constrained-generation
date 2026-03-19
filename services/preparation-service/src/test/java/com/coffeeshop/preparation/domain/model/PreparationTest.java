package com.coffeeshop.preparation.domain.model;

import com.coffeeshop.preparation.domain.event.PreparationStarted;
import com.coffeeshop.preparation.domain.service.RecipeResolutionService;
import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import com.coffeeshop.shared.domain.DomainEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PreparationTest {

    private RecipeResolutionService recipeService;

    @BeforeEach
    void setUp() {
        recipeService = new RecipeResolutionService();
    }

    @Test
    void createFromOrder_shouldInitializeWithPendingStatus() {
        UUID orderId = UUID.randomUUID();
        int tableNumber = 5;
        PreparationItem item = new PreparationItem(
                UUID.randomUUID(), CoffeeType.Espresso, CoffeeSize.Single, null);

        Preparation preparation = Preparation.createFromOrder(orderId, tableNumber, List.of(item));

        assertThat(preparation.getPreparationId()).isNotNull();
        assertThat(preparation.getOrderId()).isEqualTo(orderId);
        assertThat(preparation.getTableNumber()).isEqualTo(tableNumber);
        assertThat(preparation.getStatus()).isEqualTo(PreparationStatus.PENDING);
        assertThat(preparation.getItems()).hasSize(1);
        assertThat(preparation.getCreatedAt()).isNotNull();
        assertThat(preparation.getCompletedAt()).isNull();
    }

    @Test
    void startItem_shouldTransitionItemAndPreparationToInProgress() {
        UUID itemId = UUID.randomUUID();
        PreparationItem item = new PreparationItem(
                itemId, CoffeeType.Espresso, CoffeeSize.Single, null);
        Preparation preparation = Preparation.createFromOrder(UUID.randomUUID(), 3, List.of(item));

        PreparationStarted event = preparation.startItem(itemId, recipeService);

        assertThat(preparation.getStatus()).isEqualTo(PreparationStatus.IN_PROGRESS);
        assertThat(preparation.getItems().get(0).getStatus()).isEqualTo(ItemPreparationStatus.IN_PROGRESS);
        assertThat(event).isNotNull();
        assertThat(event.orderId()).isEqualTo(preparation.getOrderId());
        assertThat(event.itemId()).isEqualTo(itemId);
        assertThat(event.recipe()).isNotEmpty();
    }

    @Test
    void completeItem_shouldTransitionItemToDone() {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        PreparationItem item1 = new PreparationItem(
                itemId1, CoffeeType.Latte, CoffeeSize.Tall, null);
        PreparationItem item2 = new PreparationItem(
                itemId2, CoffeeType.Americano, CoffeeSize.Grande, null);
        Preparation preparation = Preparation.createFromOrder(
                UUID.randomUUID(), 7, List.of(item1, item2));

        preparation.startItem(itemId1, recipeService);
        List<DomainEvent> events = preparation.completeItem(itemId1);

        assertThat(preparation.getItems().get(0).getStatus()).isEqualTo(ItemPreparationStatus.DONE);
        assertThat(preparation.getStatus()).isEqualTo(PreparationStatus.IN_PROGRESS);
        assertThat(preparation.getCompletedAt()).isNull();
        // Only CoffeePrepared event, not OrderReadyForDelivery (second item still pending)
        assertThat(events).hasSize(1);
    }

    @Test
    void completeAllItems_shouldTransitionPreparationToReady() {
        UUID itemId1 = UUID.randomUUID();
        UUID itemId2 = UUID.randomUUID();
        PreparationItem item1 = new PreparationItem(
                itemId1, CoffeeType.Espresso, CoffeeSize.Single, null);
        PreparationItem item2 = new PreparationItem(
                itemId2, CoffeeType.Espresso, CoffeeSize.Double, null);
        Preparation preparation = Preparation.createFromOrder(
                UUID.randomUUID(), 2, List.of(item1, item2));

        preparation.startItem(itemId1, recipeService);
        preparation.completeItem(itemId1);

        preparation.startItem(itemId2, recipeService);
        List<DomainEvent> events = preparation.completeItem(itemId2);

        assertThat(preparation.getStatus()).isEqualTo(PreparationStatus.READY);
        assertThat(preparation.getCompletedAt()).isNotNull();
        // CoffeePrepared + OrderReadyForDelivery
        assertThat(events).hasSize(2);
    }

    @Test
    void startItem_withNonExistentItemId_shouldThrowException() {
        PreparationItem item = new PreparationItem(
                UUID.randomUUID(), CoffeeType.Espresso, CoffeeSize.Single, null);
        Preparation preparation = Preparation.createFromOrder(UUID.randomUUID(), 1, List.of(item));

        UUID nonExistentId = UUID.randomUUID();

        assertThatThrownBy(() -> preparation.startItem(nonExistentId, recipeService))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(nonExistentId.toString());
    }

    @Test
    void completeItem_beforeStarting_shouldThrowException() {
        UUID itemId = UUID.randomUUID();
        PreparationItem item = new PreparationItem(
                itemId, CoffeeType.Espresso, CoffeeSize.Single, null);
        Preparation preparation = Preparation.createFromOrder(UUID.randomUUID(), 4, List.of(item));

        assertThatThrownBy(() -> preparation.completeItem(itemId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining(itemId.toString());
    }
}
