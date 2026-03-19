package com.coffeeshop.inventory.domain.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReplenishmentTest {

    @Test
    void request_createsReplenishmentWithRequestedStatus() {
        Replenishment r = Replenishment.request("espresso-beans");

        assertThat(r.getReplenishmentId()).isNotNull();
        assertThat(r.getMaterialId()).isEqualTo("espresso-beans");
        assertThat(r.getStatus()).isEqualTo(ReplenishmentStatus.REQUESTED);
        assertThat(r.getRequestedAt()).isNotNull();
        assertThat(r.getSupplier()).isNull();
        assertThat(r.getExpectedDeliveryDate()).isNull();
        assertThat(r.getConfirmedAt()).isNull();
    }

    @Test
    void fullLifecycle_request_toPurchaseOrder_toDelivered() {
        Replenishment r = Replenishment.request("milk");
        LocalDate expectedDate = LocalDate.now().plusDays(3);

        r.createPurchaseOrder("Bean Supplier Co.", expectedDate);

        assertThat(r.getStatus()).isEqualTo(ReplenishmentStatus.PURCHASE_ORDERED);
        assertThat(r.getSupplier()).isEqualTo("Bean Supplier Co.");
        assertThat(r.getExpectedDeliveryDate()).isEqualTo(expectedDate);

        r.confirmDelivery();

        assertThat(r.getStatus()).isEqualTo(ReplenishmentStatus.DELIVERED);
        assertThat(r.getConfirmedAt()).isNotNull();
    }

    @Test
    void createPurchaseOrder_fromPurchaseOrdered_throwsIllegalStateException() {
        Replenishment r = Replenishment.request("milk");
        r.createPurchaseOrder("Supplier", LocalDate.now().plusDays(3));

        assertThatThrownBy(() -> r.createPurchaseOrder("Other Supplier", LocalDate.now().plusDays(5)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot create purchase order")
                .hasMessageContaining("PURCHASE_ORDERED");
    }

    @Test
    void createPurchaseOrder_fromDelivered_throwsIllegalStateException() {
        Replenishment r = Replenishment.request("milk");
        r.createPurchaseOrder("Supplier", LocalDate.now().plusDays(3));
        r.confirmDelivery();

        assertThatThrownBy(() -> r.createPurchaseOrder("Supplier", LocalDate.now().plusDays(5)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot create purchase order")
                .hasMessageContaining("DELIVERED");
    }

    @Test
    void confirmDelivery_fromRequested_throwsIllegalStateException() {
        Replenishment r = Replenishment.request("milk");

        assertThatThrownBy(() -> r.confirmDelivery())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot confirm delivery")
                .hasMessageContaining("REQUESTED");
    }

    @Test
    void confirmDelivery_fromDelivered_throwsIllegalStateException() {
        Replenishment r = Replenishment.request("milk");
        r.createPurchaseOrder("Supplier", LocalDate.now().plusDays(3));
        r.confirmDelivery();

        assertThatThrownBy(() -> r.confirmDelivery())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot confirm delivery")
                .hasMessageContaining("DELIVERED");
    }
}
