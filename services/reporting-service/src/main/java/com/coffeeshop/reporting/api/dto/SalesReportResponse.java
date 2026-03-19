package com.coffeeshop.reporting.api.dto;

import java.util.List;

public record SalesReportResponse(
        int totalOrders,
        int totalRevenue,
        int averageOrderValue,
        List<HourlyCount> ordersByHour
) {
    public record HourlyCount(String hour, int count) {
    }
}
