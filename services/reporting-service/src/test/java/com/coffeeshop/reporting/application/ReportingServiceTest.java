package com.coffeeshop.reporting.application;

import com.coffeeshop.reporting.api.dto.SalesReportResponse;
import com.coffeeshop.reporting.domain.model.SalesProjection;
import com.coffeeshop.reporting.infrastructure.persistence.InventoryProjectionRepository;
import com.coffeeshop.reporting.infrastructure.persistence.SalesProjectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {

    @Mock
    private SalesProjectionRepository salesProjectionRepository;

    @Mock
    private InventoryProjectionRepository inventoryProjectionRepository;

    private ReportingService reportingService;

    @BeforeEach
    void setUp() {
        reportingService = new ReportingService(salesProjectionRepository, inventoryProjectionRepository);
    }

    @Test
    void shouldReturnZerosWhenNoSalesExist() {
        when(salesProjectionRepository.findAll()).thenReturn(Collections.emptyList());

        SalesReportResponse report = reportingService.getSalesReport();

        assertThat(report.totalOrders()).isEqualTo(0);
        assertThat(report.totalRevenue()).isEqualTo(0);
        assertThat(report.averageOrderValue()).isEqualTo(0);
        assertThat(report.ordersByHour()).isEmpty();
    }

    @Test
    void shouldCalculateReportForSingleOrder() {
        SalesProjection projection = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 1, "Latte Tall",
                120, LocalDateTime.of(2026, 3, 19, 9, 30), LocalDateTime.of(2026, 3, 19, 9, 35)
        );
        when(salesProjectionRepository.findAll()).thenReturn(List.of(projection));

        SalesReportResponse report = reportingService.getSalesReport();

        assertThat(report.totalOrders()).isEqualTo(1);
        assertThat(report.totalRevenue()).isEqualTo(120);
        assertThat(report.averageOrderValue()).isEqualTo(120);
        assertThat(report.ordersByHour()).hasSize(1);
        assertThat(report.ordersByHour().get(0).hour()).isEqualTo("09:00");
        assertThat(report.ordersByHour().get(0).count()).isEqualTo(1);
    }

    @Test
    void shouldAggregateMultipleOrders() {
        SalesProjection p1 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 1, "Espresso Single",
                60, LocalDateTime.of(2026, 3, 19, 10, 0), LocalDateTime.of(2026, 3, 19, 10, 5)
        );
        SalesProjection p2 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 2, "Latte Grande",
                140, LocalDateTime.of(2026, 3, 19, 10, 30), LocalDateTime.of(2026, 3, 19, 10, 35)
        );
        SalesProjection p3 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 3, "Cappuccino Tall",
                120, LocalDateTime.of(2026, 3, 19, 14, 15), LocalDateTime.of(2026, 3, 19, 14, 20)
        );
        when(salesProjectionRepository.findAll()).thenReturn(List.of(p1, p2, p3));

        SalesReportResponse report = reportingService.getSalesReport();

        assertThat(report.totalOrders()).isEqualTo(3);
        assertThat(report.totalRevenue()).isEqualTo(320);
        assertThat(report.averageOrderValue()).isEqualTo(106); // 320 / 3 = 106 (integer division)
    }

    @Test
    void shouldGroupOrdersByHour() {
        SalesProjection p1 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 1, "Espresso Single",
                60, LocalDateTime.of(2026, 3, 19, 9, 0), null
        );
        SalesProjection p2 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 2, "Latte Tall",
                120, LocalDateTime.of(2026, 3, 19, 9, 45), null
        );
        SalesProjection p3 = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 3, "Americano Grande",
                120, LocalDateTime.of(2026, 3, 19, 14, 10), null
        );
        when(salesProjectionRepository.findAll()).thenReturn(List.of(p1, p2, p3));

        SalesReportResponse report = reportingService.getSalesReport();

        assertThat(report.ordersByHour()).hasSize(2);
        // Sorted by key, so 09:00 comes before 14:00
        assertThat(report.ordersByHour().get(0).hour()).isEqualTo("09:00");
        assertThat(report.ordersByHour().get(0).count()).isEqualTo(2);
        assertThat(report.ordersByHour().get(1).hour()).isEqualTo("14:00");
        assertThat(report.ordersByHour().get(1).count()).isEqualTo(1);
    }

    @Test
    void shouldExcludeProjectionsWithNullPlacedAtFromHourlyCounts() {
        SalesProjection withTime = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 1, "Latte Tall",
                120, LocalDateTime.of(2026, 3, 19, 11, 0), null
        );
        SalesProjection withoutTime = new SalesProjection(
                UUID.randomUUID(), UUID.randomUUID(), 2, "Espresso Single",
                60, null, null
        );
        when(salesProjectionRepository.findAll()).thenReturn(List.of(withTime, withoutTime));

        SalesReportResponse report = reportingService.getSalesReport();

        // Both count toward totals
        assertThat(report.totalOrders()).isEqualTo(2);
        assertThat(report.totalRevenue()).isEqualTo(180);
        // But only the one with placedAt appears in hourly grouping
        assertThat(report.ordersByHour()).hasSize(1);
        assertThat(report.ordersByHour().get(0).hour()).isEqualTo("11:00");
        assertThat(report.ordersByHour().get(0).count()).isEqualTo(1);
    }
}
