package com.coffeeshop.preparation.domain.service;

import com.coffeeshop.preparation.domain.model.Ingredient;
import com.coffeeshop.shared.domain.CoffeeSize;
import com.coffeeshop.shared.domain.CoffeeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class RecipeResolutionServiceTest {

    private RecipeResolutionService service;

    @BeforeEach
    void setUp() {
        service = new RecipeResolutionService();
    }

    @Test
    void espressoSingle_shouldReturn20gBeansAndFilterPaper() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Espresso, CoffeeSize.Single, null);

        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 20.0, "g"),
                        tuple("espresso", 30.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets")
                );
    }

    @Test
    void espressoDouble_shouldReturn40gBeansAndFilterPaper() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Espresso, CoffeeSize.Double, null);

        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 40.0, "g"),
                        tuple("espresso", 60.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets")
                );
    }

    @Test
    void americanoTall_shouldReturnBeansFilterPaperAndWater() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Americano, CoffeeSize.Tall, null);

        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 20.0, "g"),
                        tuple("espresso", 30.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("water", 170.0, "ml")
                );
    }

    @Test
    void latteGrande_shouldReturnBeansFilterPaperAndMilk() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Latte, CoffeeSize.Grande, null);

        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 40.0, "g"),
                        tuple("espresso", 60.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("milk", 250.0, "ml")
                );
    }

    @Test
    void latteWithMoreFoam_shouldReduceMilkAmountBy30Percent() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Latte, CoffeeSize.Grande, "MoreFoam");

        // Grande milk = 250ml, MoreFoam: milkRatio=0.7, foamRatio=0.3
        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 40.0, "g"),
                        tuple("espresso", 60.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("milk", 175.0, "ml"),      // 250 * 0.7
                        tuple("foam", 75.0, "ml")         // 250 * 0.3
                );
    }

    @Test
    void cappuccinoDefault_shouldSplit50PercentMilkAndFoam() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Cappuccino, CoffeeSize.Tall, null);

        // Tall milk = 200ml, default cappuccino: 50/50
        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 20.0, "g"),
                        tuple("espresso", 30.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("milk", 100.0, "ml"),       // 200 * 0.5
                        tuple("foam", 100.0, "ml")         // 200 * 0.5
                );
    }

    @Test
    void cappuccinoWithSoyMilk_shouldUseSoyMilkInsteadOfMilk() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Cappuccino, CoffeeSize.Tall, "SoyMilk");

        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 20.0, "g"),
                        tuple("espresso", 30.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("soy_milk", 100.0, "ml"),   // 200 * 0.5
                        tuple("foam", 100.0, "ml")         // 200 * 0.5
                );
    }

    @Test
    void cappuccinoWithWhippedCream_shouldAdd20mlWhippedCream() {
        List<Ingredient> recipe = service.resolve(CoffeeType.Cappuccino, CoffeeSize.Short, "WhippedCream");

        // Short milk = 150ml, default cappuccino: 50/50
        assertThat(recipe).extracting(Ingredient::material, Ingredient::quantity, Ingredient::unit)
                .containsExactlyInAnyOrder(
                        tuple("coffee_beans", 20.0, "g"),
                        tuple("espresso", 30.0, "ml"),
                        tuple("filter_paper", 1.0, "sheets"),
                        tuple("milk", 75.0, "ml"),         // 150 * 0.5
                        tuple("foam", 75.0, "ml"),          // 150 * 0.5
                        tuple("whipped_cream", 20.0, "ml")
                );
    }
}
