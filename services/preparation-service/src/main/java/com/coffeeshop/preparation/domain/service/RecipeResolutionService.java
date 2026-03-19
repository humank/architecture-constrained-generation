package com.coffeeshop.preparation.domain.service;

import com.coffeeshop.preparation.domain.model.Ingredient;
import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RecipeResolutionService {

    private static final int COFFEE_BEANS_PER_SHOT_GRAMS = 20;
    private static final int ESPRESSO_PER_SHOT_ML = 30;
    private static final int FILTER_PAPER_PER_EXTRACTION = 1;
    private static final int WHIPPED_CREAM_ML = 20;

    public List<Ingredient> resolve(CoffeeType coffeeType, CoffeeSize size, String customizations) {
        Set<String> customs = parseCustomizations(customizations);
        int shots = size.getShots();

        List<Ingredient> ingredients = new ArrayList<>();

        // Coffee beans
        ingredients.add(new Ingredient("coffee_beans", shots * COFFEE_BEANS_PER_SHOT_GRAMS, "g"));

        // Espresso output
        ingredients.add(new Ingredient("espresso", shots * ESPRESSO_PER_SHOT_ML, "ml"));

        // Filter paper for Espresso type only
        if (coffeeType == CoffeeType.Espresso) {
            ingredients.add(new Ingredient("filter_paper", FILTER_PAPER_PER_EXTRACTION, "sheets"));
            return ingredients;
        }

        // Filter paper for non-Espresso types (still need extraction)
        ingredients.add(new Ingredient("filter_paper", FILTER_PAPER_PER_EXTRACTION, "sheets"));

        // Americano: water, no milk
        if (coffeeType == CoffeeType.Americano) {
            int waterMl = getWaterAmount(size);
            ingredients.add(new Ingredient("water", waterMl, "ml"));
            return ingredients;
        }

        // Latte and Cappuccino: milk (or soy milk) with foam ratios
        boolean useSoyMilk = customs.contains("SoyMilk");
        String milkMaterial = useSoyMilk ? "soy_milk" : "milk";
        int totalMilkMl = getMilkAmount(size);

        double milkRatio;
        double foamRatio;

        if (coffeeType == CoffeeType.Latte) {
            if (customs.contains("MoreFoam")) {
                milkRatio = 0.7;
                foamRatio = 0.3;
            } else if (customs.contains("WithFoam")) {
                milkRatio = 0.85;
                foamRatio = 0.15;
            } else {
                // Default for Latte: no foam
                milkRatio = 1.0;
                foamRatio = 0.0;
            }
        } else {
            // Cappuccino
            if (customs.contains("DryFoam")) {
                milkRatio = 0.33;
                foamRatio = 0.67;
            } else if (customs.contains("WetFoam")) {
                milkRatio = 0.67;
                foamRatio = 0.33;
            } else {
                // Default for Cappuccino
                milkRatio = 0.5;
                foamRatio = 0.5;
            }
        }

        double milkAmount = totalMilkMl * milkRatio;
        double foamAmount = totalMilkMl * foamRatio;

        if (milkAmount > 0) {
            ingredients.add(new Ingredient(milkMaterial, milkAmount, "ml"));
        }
        if (foamAmount > 0) {
            ingredients.add(new Ingredient("foam", foamAmount, "ml"));
        }

        // Whipped cream for Cappuccino
        if (coffeeType == CoffeeType.Cappuccino && customs.contains("WhippedCream")) {
            ingredients.add(new Ingredient("whipped_cream", WHIPPED_CREAM_ML, "ml"));
        }

        return ingredients;
    }

    private Set<String> parseCustomizations(String customizations) {
        if (customizations == null || customizations.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(customizations.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private int getMilkAmount(CoffeeSize size) {
        return switch (size) {
            case Short -> 150;
            case Tall -> 200;
            case Grande -> 250;
            case Venti -> 300;
            default -> throw new IllegalArgumentException("Invalid size for milk-based drink: " + size);
        };
    }

    private int getWaterAmount(CoffeeSize size) {
        return switch (size) {
            case Short -> 120;
            case Tall -> 170;
            case Grande -> 220;
            case Venti -> 270;
            default -> throw new IllegalArgumentException("Invalid size for Americano: " + size);
        };
    }
}
