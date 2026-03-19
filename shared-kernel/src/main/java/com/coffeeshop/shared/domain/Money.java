package com.coffeeshop.shared.domain;

public record Money(int amount) {

    public Money {
        if (amount < 0) {
            throw new IllegalArgumentException("Money amount cannot be negative: " + amount);
        }
    }

    public static final Money ZERO = new Money(0);

    public Money add(Money other) {
        return new Money(this.amount + other.amount);
    }

    public Money subtract(Money other) {
        return new Money(this.amount - other.amount);
    }

    public Money multiply(int factor) {
        return new Money(this.amount * factor);
    }
}
