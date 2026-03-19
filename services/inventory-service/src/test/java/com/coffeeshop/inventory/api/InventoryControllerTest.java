package com.coffeeshop.inventory.api;

import com.coffeeshop.inventory.application.InventoryService;
import com.coffeeshop.inventory.domain.model.InventoryItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InventoryController.class)
class InventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InventoryService inventoryService;

    @Test
    @DisplayName("GET /api/inventory returns all items with correct field names")
    void getAllItems() throws Exception {
        InventoryItem item = new InventoryItem("coffee_beans", "Coffee Beans", 100000, 100000, "g");

        when(inventoryService.getAllItems()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/inventory"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$[0].materialId").value("coffee_beans"))
                .andExpect(jsonPath("$[0].materialName").value("Coffee Beans"))
                .andExpect(jsonPath("$[0].alertTriggered").value(false))
                // Verify the field is NOT named "isAlertTriggered"
                .andExpect(jsonPath("$[0].isAlertTriggered").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/inventory returns alertTriggered as boolean (not string)")
    void alertTriggeredIsBoolean() throws Exception {
        InventoryItem item = new InventoryItem("coffee_beans", "Coffee Beans", 20000, 100000, "g");
        // Force alert triggered state
        item.deduct(1); // Just to ensure item exists

        when(inventoryService.getAllItems()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/inventory"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertTriggered").isBoolean());
    }
}
