package com.coffeeshop.reporting.application;

import com.coffeeshop.reporting.api.dto.InventoryReportResponse;
import com.coffeeshop.reporting.api.dto.SalesReportResponse;
import com.coffeeshop.reporting.domain.model.InventoryProjection;
import com.coffeeshop.reporting.domain.model.SalesProjection;
import com.coffeeshop.reporting.infrastructure.persistence.InventoryProjectionRepository;
import com.coffeeshop.reporting.infrastructure.persistence.SalesProjectionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReportingService {

    private static final DateTimeFormatter HOUR_FORMAT = DateTimeFormatter.ofPattern("HH:00");

    private final SalesProjectionRepository salesProjectionRepository;
    private final InventoryProjectionRepository inventoryProjectionRepository;

    public ReportingService(SalesProjectionRepository salesProjectionRepository,
                            InventoryProjectionRepository inventoryProjectionRepository) {
        this.salesProjectionRepository = salesProjectionRepository;
        this.inventoryProjectionRepository = inventoryProjectionRepository;
    }

    public SalesReportResponse getSalesReport() {
        List<SalesProjection> projections = salesProjectionRepository.findAll();

        int totalOrders = projections.size();
        int totalRevenue = projections.stream()
                .mapToInt(SalesProjection::getTotal)
                .sum();
        int averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        Map<String, Long> hourCounts = projections.stream()
                .filter(p -> p.getPlacedAt() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getPlacedAt().format(HOUR_FORMAT),
                        Collectors.counting()
                ));

        List<SalesReportResponse.HourlyCount> ordersByHour = hourCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new SalesReportResponse.HourlyCount(e.getKey(), e.getValue().intValue()))
                .toList();

        return new SalesReportResponse(totalOrders, totalRevenue, averageOrderValue, ordersByHour);
    }

    public List<InventoryReportResponse> getInventoryReport() {
        return inventoryProjectionRepository.findLatestPerMaterial().stream()
                .map(ip -> new InventoryReportResponse(
                        ip.getMaterial(),
                        ip.getQuantityDeducted(),
                        ip.getRemainingLevel(),
                        ip.getMaxCapacity(),
                        ip.getPercentageRemaining(),
                        ip.getRecordedAt()
                ))
                .toList();
    }
}
