package com.coffeeshop.shared.domain;

public enum Customization {
    NoFoam,
    WithFoam,
    MoreFoam,
    DryFoam,
    WetFoam,
    WhippedCream,
    SoyMilk;

    /**
     * Validates whether this customization is valid for the given coffee type.
     * NoFoam, WithFoam, MoreFoam: Latte only.
     * DryFoam, WetFoam: Cappuccino only.
     * WhippedCream: Cappuccino only.
     * SoyMilk: Latte and Cappuccino only.
     */
    public boolean isValidFor(CoffeeType type) {
        return switch (this) {
            case NoFoam, WithFoam, MoreFoam -> type == CoffeeType.Latte;
            case DryFoam, WetFoam -> type == CoffeeType.Cappuccino;
            case WhippedCream -> type == CoffeeType.Cappuccino;
            case SoyMilk -> type == CoffeeType.Latte || type == CoffeeType.Cappuccino;
        };
    }

    /**
     * Returns the surcharge for this customization in TWD.
     * WhippedCream: 20, all others: 0.
     */
    public int getSurcharge() {
        return this == WhippedCream ? 20 : 0;
    }
}
