package com.coffeeshop.shared.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class CoffeeSizeTest {

    @Test
    void singleShouldHaveOneShot() {
        assertThat(CoffeeSize.Single.getShots()).isEqualTo(1);
    }

    @Test
    void doubleShouldHaveTwoShots() {
        assertThat(CoffeeSize.Double.getShots()).isEqualTo(2);
    }

    @Test
    void shortShouldHaveOneShot() {
        assertThat(CoffeeSize.Short.getShots()).isEqualTo(1);
    }

    @Test
    void tallShouldHaveOneShot() {
        assertThat(CoffeeSize.Tall.getShots()).isEqualTo(1);
    }

    @Test
    void grandeShouldHaveTwoShots() {
        assertThat(CoffeeSize.Grande.getShots()).isEqualTo(2);
    }

    @Test
    void ventiShouldHaveTwoShots() {
        assertThat(CoffeeSize.Venti.getShots()).isEqualTo(2);
    }

    // --- isValidFor: Espresso only accepts Single and Double ---

    @Test
    void singleShouldBeValidForEspresso() {
        assertThat(CoffeeSize.Single.isValidFor(CoffeeType.Espresso)).isTrue();
    }

    @Test
    void doubleShouldBeValidForEspresso() {
        assertThat(CoffeeSize.Double.isValidFor(CoffeeType.Espresso)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = CoffeeSize.class, names = {"Short", "Tall", "Grande", "Venti"})
    void nonEspressoSizesShouldBeInvalidForEspresso(CoffeeSize size) {
        assertThat(size.isValidFor(CoffeeType.Espresso)).isFalse();
    }

    // --- isValidFor: non-Espresso types accept Short, Tall, Grande, Venti ---

    @ParameterizedTest
    @EnumSource(value = CoffeeSize.class, names = {"Short", "Tall", "Grande", "Venti"})
    void shortThroughVentiShouldBeValidForAmericano(CoffeeSize size) {
        assertThat(size.isValidFor(CoffeeType.Americano)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = CoffeeSize.class, names = {"Short", "Tall", "Grande", "Venti"})
    void shortThroughVentiShouldBeValidForLatte(CoffeeSize size) {
        assertThat(size.isValidFor(CoffeeType.Latte)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = CoffeeSize.class, names = {"Short", "Tall", "Grande", "Venti"})
    void shortThroughVentiShouldBeValidForCappuccino(CoffeeSize size) {
        assertThat(size.isValidFor(CoffeeType.Cappuccino)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = CoffeeType.class, names = {"Americano", "Latte", "Cappuccino"})
    void singleShouldBeInvalidForNonEspresso(CoffeeType type) {
        assertThat(CoffeeSize.Single.isValidFor(type)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = CoffeeType.class, names = {"Americano", "Latte", "Cappuccino"})
    void doubleShouldBeInvalidForNonEspresso(CoffeeType type) {
        assertThat(CoffeeSize.Double.isValidFor(type)).isFalse();
    }
}
