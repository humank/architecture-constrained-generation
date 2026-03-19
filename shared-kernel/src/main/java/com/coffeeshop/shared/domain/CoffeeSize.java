package com.coffeeshop.shared.domain;

public enum CoffeeSize {
    Single(1),
    Double(2),
    Short(1),
    Tall(1),
    Grande(2),
    Venti(2);

    private final int shots;

    CoffeeSize(int shots) {
        this.shots = shots;
    }

    public int getShots() {
        return shots;
    }

    /**
     * Validates whether this size is valid for the given coffee type.
     * Espresso: Single, Double only.
     * Americano, Latte, Cappuccino: Short, Tall, Grande, Venti only.
     */
    public boolean isValidFor(CoffeeType type) {
        return switch (type) {
            case Espresso -> this == Single || this == Double;
            case Americano, Latte, Cappuccino -> this == Short || this == Tall || this == Grande || this == Venti;
        };
    }
}
