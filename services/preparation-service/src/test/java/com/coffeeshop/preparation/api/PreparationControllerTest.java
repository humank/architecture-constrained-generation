package com.coffeeshop.preparation.api;

import com.coffeeshop.preparation.application.PreparationService;
import com.coffeeshop.preparation.domain.model.PreparationStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PreparationController.class)
class PreparationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PreparationService preparationService;

    @Nested
    @DisplayName("GET /api/preparations?status=...")
    class GetByStatus {

        @Test
        @DisplayName("?status=Pending,InProgress returns filtered preparations (semantic filter)")
        void pendingAndInProgress() throws Exception {
            when(preparationService.getByStatus(
                    List.of(PreparationStatus.PENDING, PreparationStatus.IN_PROGRESS)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/preparations").param("status", "Pending,InProgress"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("application/json"));
        }

        @Test
        @DisplayName("?status=PENDING also works (case mapping)")
        void pendingUpperCase() throws Exception {
            when(preparationService.getByStatus(List.of(PreparationStatus.PENDING)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/preparations").param("status", "PENDING"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("?status=INVALID returns 400")
        void invalidStatus() throws Exception {
            mockMvc.perform(get("/api/preparations").param("status", "INVALID"))
                    .andExpect(status().isBadRequest());
        }
    }
}
