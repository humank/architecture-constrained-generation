package com.coffeeshop.shared.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MenuPricingTest {

    // --- Espresso ---

    @Test
    void espressoSingleShouldCost60() {
        assertThat(MenuPricing.getPrice(CoffeeType.Espresso, CoffeeSize.Single)).isEqualTo(new Money(60));
    }

    @Test
    void espressoDoubleShouldCost80() {
        assertThat(MenuPricing.getPrice(CoffeeType.Espresso, CoffeeSize.Double)).isEqualTo(new Money(80));
    }

    // --- Americano ---

    @Test
    void americanoShortShouldCost80() {
        assertThat(MenuPricing.getPrice(CoffeeType.Americano, CoffeeSize.Short)).isEqualTo(new Money(80));
    }

    @Test
    void americanoTallShouldCost100() {
        assertThat(MenuPricing.getPrice(CoffeeType.Americano, CoffeeSize.Tall)).isEqualTo(new Money(100));
    }

    @Test
    void americanoGrandeShouldCost120() {
        assertThat(MenuPricing.getPrice(CoffeeType.Americano, CoffeeSize.Grande)).isEqualTo(new Money(120));
    }

    @Test
    void americanoVentiShouldCost140() {
        assertThat(MenuPricing.getPrice(CoffeeType.Americano, CoffeeSize.Venti)).isEqualTo(new Money(140));
    }

    // --- Latte ---

    @Test
    void latteShortShouldCost100() {
        assertThat(MenuPricing.getPrice(CoffeeType.Latte, CoffeeSize.Short)).isEqualTo(new Money(100));
    }

    @Test
    void latteTallShouldCost120() {
        assertThat(MenuPricing.getPrice(CoffeeType.Latte, CoffeeSize.Tall)).isEqualTo(new Money(120));
    }

    @Test
    void latteGrandeShouldCost140() {
        assertThat(MenuPricing.getPrice(CoffeeType.Latte, CoffeeSize.Grande)).isEqualTo(new Money(140));
    }

    @Test
    void latteVentiShouldCost160() {
        assertThat(MenuPricing.getPrice(CoffeeType.Latte, CoffeeSize.Venti)).isEqualTo(new Money(160));
    }

    // --- Cappuccino ---

    @Test
    void cappuccinoShortShouldCost100() {
        assertThat(MenuPricing.getPrice(CoffeeType.Cappuccino, CoffeeSize.Short)).isEqualTo(new Money(100));
    }

    @Test
    void cappuccinoTallShouldCost120() {
        assertThat(MenuPricing.getPrice(CoffeeType.Cappuccino, CoffeeSize.Tall)).isEqualTo(new Money(120));
    }

    @Test
    void cappuccinoGrandeShouldCost140() {
        assertThat(MenuPricing.getPrice(CoffeeType.Cappuccino, CoffeeSize.Grande)).isEqualTo(new Money(140));
    }

    @Test
    void cappuccinoVentiShouldCost160() {
        assertThat(MenuPricing.getPrice(CoffeeType.Cappuccino, CoffeeSize.Venti)).isEqualTo(new Money(160));
    }

    // --- Invalid combinations ---

    @Test
    void espressoWithShortShouldThrow() {
        assertThatThrownBy(() -> MenuPricing.getPrice(CoffeeType.Espresso, CoffeeSize.Short))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void americanoWithSingleShouldThrow() {
        assertThatThrownBy(() -> MenuPricing.getPrice(CoffeeType.Americano, CoffeeSize.Single))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
