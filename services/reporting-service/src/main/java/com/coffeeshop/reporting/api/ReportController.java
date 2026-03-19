package com.coffeeshop.reporting.api;

import com.coffeeshop.reporting.api.dto.InventoryReportResponse;
import com.coffeeshop.reporting.api.dto.SalesReportResponse;
import com.coffeeshop.reporting.application.ReportingService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reporting")
public class ReportController {

    private final ReportingService reportingService;

    public ReportController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/sales")
    public ResponseEntity<SalesReportResponse> getSalesReport() {
        return ResponseEntity.ok(reportingService.getSalesReport());
    }

    @GetMapping("/inventory")
    public ResponseEntity<List<InventoryReportResponse>> getInventoryReport() {
        return ResponseEntity.ok(reportingService.getInventoryReport());
    }
}
