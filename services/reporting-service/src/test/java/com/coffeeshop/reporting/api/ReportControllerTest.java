package com.coffeeshop.reporting.api;

import com.coffeeshop.reporting.api.dto.SalesReportResponse;
import com.coffeeshop.reporting.application.ReportingService;
import org.junit.jupiter.api.DisplayName;
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

@WebMvcTest(ReportController.class)
class ReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReportingService reportingService;

    @Test
    @DisplayName("GET /api/reporting/sales returns aggregated object (not array)")
    void salesReportReturnsObject() throws Exception {
        SalesReportResponse report = new SalesReportResponse(
                10, 2800, 280, Collections.emptyList());

        when(reportingService.getSalesReport()).thenReturn(report);

        mockMvc.perform(get("/api/reporting/sales"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$.totalOrders").value(10))
                .andExpect(jsonPath("$.totalRevenue").value(2800))
                .andExpect(jsonPath("$.averageOrderValue").value(280))
                .andExpect(jsonPath("$.ordersByHour").isArray())
                .andExpect(jsonPath("$.ordersByHour").isEmpty());
    }

    @Test
    @DisplayName("GET /api/reporting/sales ordersByHour is empty array not null")
    void ordersByHourIsEmptyNotNull() throws Exception {
        SalesReportResponse report = new SalesReportResponse(0, 0, 0, Collections.emptyList());

        when(reportingService.getSalesReport()).thenReturn(report);

        mockMvc.perform(get("/api/reporting/sales"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ordersByHour").isArray())
                .andExpect(jsonPath("$.ordersByHour").isEmpty());
    }

    @Test
    @DisplayName("GET /api/reporting/sales returns money in whole TWD")
    void moneyInWholeTwd() throws Exception {
        SalesReportResponse report = new SalesReportResponse(
                5, 600, 120,
                List.of(new SalesReportResponse.HourlyCount("10:00", 3),
                        new SalesReportResponse.HourlyCount("11:00", 2)));

        when(reportingService.getSalesReport()).thenReturn(report);

        mockMvc.perform(get("/api/reporting/sales"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(600))
                .andExpect(jsonPath("$.ordersByHour[0].hour").value("10:00"))
                .andExpect(jsonPath("$.ordersByHour[0].count").value(3));
    }
}
