package com.coffeeshop.shared.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyTest {

    @Test
    void shouldCreateMoneyWithZeroAmount() {
        Money money = new Money(0);
        assertThat(money.amount()).isEqualTo(0);
    }

    @Test
    void shouldCreateMoneyWithPositiveAmount() {
        Money money = new Money(100);
        assertThat(money.amount()).isEqualTo(100);
    }

    @Test
    void shouldThrowWhenAmountIsNegative() {
        assertThatThrownBy(() -> new Money(-1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("negative");
    }

    @Test
    void zeroConstantShouldHaveZeroAmount() {
        assertThat(Money.ZERO.amount()).isEqualTo(0);
    }

    @Test
    void shouldAddTwoMoneyValues() {
        Money a = new Money(60);
        Money b = new Money(40);
        assertThat(a.add(b)).isEqualTo(new Money(100));
    }

    @Test
    void shouldAddZero() {
        Money a = new Money(50);
        assertThat(a.add(Money.ZERO)).isEqualTo(new Money(50));
    }

    @Test
    void shouldSubtractMoney() {
        Money a = new Money(100);
        Money b = new Money(40);
        assertThat(a.subtract(b)).isEqualTo(new Money(60));
    }

    @Test
    void shouldThrowWhenSubtractionResultsInNegative() {
        Money a = new Money(10);
        Money b = new Money(20);
        assertThatThrownBy(() -> a.subtract(b))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldMultiplyByPositiveFactor() {
        Money money = new Money(50);
        assertThat(money.multiply(3)).isEqualTo(new Money(150));
    }

    @Test
    void shouldMultiplyByZero() {
        Money money = new Money(50);
        assertThat(money.multiply(0)).isEqualTo(Money.ZERO);
    }

    @Test
    void shouldMultiplyByOne() {
        Money money = new Money(75);
        assertThat(money.multiply(1)).isEqualTo(new Money(75));
    }
}
