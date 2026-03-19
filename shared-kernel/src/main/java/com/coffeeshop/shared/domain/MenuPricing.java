package com.coffeeshop.shared.domain;

import java.util.Map;

public final class MenuPricing {

    private MenuPricing() {
    }

    private static final Map<CoffeeType, Map<CoffeeSize, Integer>> PRICING = Map.of(
            CoffeeType.Espresso, Map.of(
                    CoffeeSize.Single, 60,
                    CoffeeSize.Double, 80
            ),
            CoffeeType.Americano, Map.of(
                    CoffeeSize.Short, 80,
                    CoffeeSize.Tall, 100,
                    CoffeeSize.Grande, 120,
                    CoffeeSize.Venti, 140
            ),
            CoffeeType.Latte, Map.of(
                    CoffeeSize.Short, 100,
                    CoffeeSize.Tall, 120,
                    CoffeeSize.Grande, 140,
                    CoffeeSize.Venti, 160
            ),
            CoffeeType.Cappuccino, Map.of(
                    CoffeeSize.Short, 100,
                    CoffeeSize.Tall, 120,
                    CoffeeSize.Grande, 140,
                    CoffeeSize.Venti, 160
            )
    );

    /**
     * Returns the base price for a coffee type and size combination.
     *
     * @throws IllegalArgumentException if the combination is invalid
     */
    public static Money getPrice(CoffeeType type, CoffeeSize size) {
        Map<CoffeeSize, Integer> sizePricing = PRICING.get(type);
        if (sizePricing == null) {
            throw new IllegalArgumentException("Unknown coffee type: " + type);
        }
        Integer price = sizePricing.get(size);
        if (price == null) {
            throw new IllegalArgumentException(
                    "Invalid size " + size + " for coffee type " + type);
        }
        return new Money(price);
    }
}
