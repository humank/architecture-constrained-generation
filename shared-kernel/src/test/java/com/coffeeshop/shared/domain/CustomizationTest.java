package com.coffeeshop.shared.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class CustomizationTest {

    // --- NoFoam, WithFoam, MoreFoam: valid only for Latte ---

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"NoFoam", "WithFoam", "MoreFoam"})
    void foamCustomizationsShouldBeValidForLatte(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Latte)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"NoFoam", "WithFoam", "MoreFoam"})
    void foamCustomizationsShouldBeInvalidForEspresso(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Espresso)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"NoFoam", "WithFoam", "MoreFoam"})
    void foamCustomizationsShouldBeInvalidForAmericano(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Americano)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"NoFoam", "WithFoam", "MoreFoam"})
    void foamCustomizationsShouldBeInvalidForCappuccino(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Cappuccino)).isFalse();
    }

    // --- DryFoam, WetFoam: valid only for Cappuccino ---

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"DryFoam", "WetFoam"})
    void dryWetFoamShouldBeValidForCappuccino(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Cappuccino)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"DryFoam", "WetFoam"})
    void dryWetFoamShouldBeInvalidForLatte(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Latte)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"DryFoam", "WetFoam"})
    void dryWetFoamShouldBeInvalidForEspresso(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Espresso)).isFalse();
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"DryFoam", "WetFoam"})
    void dryWetFoamShouldBeInvalidForAmericano(Customization customization) {
        assertThat(customization.isValidFor(CoffeeType.Americano)).isFalse();
    }

    // --- WhippedCream: valid only for Cappuccino ---

    @Test
    void whippedCreamShouldBeValidForCappuccino() {
        assertThat(Customization.WhippedCream.isValidFor(CoffeeType.Cappuccino)).isTrue();
    }

    @Test
    void whippedCreamShouldBeInvalidForLatte() {
        assertThat(Customization.WhippedCream.isValidFor(CoffeeType.Latte)).isFalse();
    }

    @Test
    void whippedCreamShouldBeInvalidForEspresso() {
        assertThat(Customization.WhippedCream.isValidFor(CoffeeType.Espresso)).isFalse();
    }

    @Test
    void whippedCreamShouldBeInvalidForAmericano() {
        assertThat(Customization.WhippedCream.isValidFor(CoffeeType.Americano)).isFalse();
    }

    // --- SoyMilk: valid for Latte and Cappuccino ---

    @Test
    void soyMilkShouldBeValidForLatte() {
        assertThat(Customization.SoyMilk.isValidFor(CoffeeType.Latte)).isTrue();
    }

    @Test
    void soyMilkShouldBeValidForCappuccino() {
        assertThat(Customization.SoyMilk.isValidFor(CoffeeType.Cappuccino)).isTrue();
    }

    @Test
    void soyMilkShouldBeInvalidForEspresso() {
        assertThat(Customization.SoyMilk.isValidFor(CoffeeType.Espresso)).isFalse();
    }

    @Test
    void soyMilkShouldBeInvalidForAmericano() {
        assertThat(Customization.SoyMilk.isValidFor(CoffeeType.Americano)).isFalse();
    }

    // --- getSurcharge ---

    @Test
    void whippedCreamSurchargeShouldBe20() {
        assertThat(Customization.WhippedCream.getSurcharge()).isEqualTo(20);
    }

    @ParameterizedTest
    @EnumSource(value = Customization.class, names = {"NoFoam", "WithFoam", "MoreFoam", "DryFoam", "WetFoam", "SoyMilk"})
    void allOtherCustomizationsShouldHaveZeroSurcharge(Customization customization) {
        assertThat(customization.getSurcharge()).isEqualTo(0);
    }
}
