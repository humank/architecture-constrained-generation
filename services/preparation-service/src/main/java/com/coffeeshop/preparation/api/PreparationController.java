package com.coffeeshop.preparation.api;

import com.coffeeshop.preparation.api.dto.PreparationResponse;
import com.coffeeshop.preparation.application.PreparationService;
import com.coffeeshop.preparation.domain.model.Preparation;
import com.coffeeshop.preparation.domain.model.PreparationStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/preparations")
public class PreparationController {

    private final PreparationService preparationService;

    public PreparationController(PreparationService preparationService) {
        this.preparationService = preparationService;
    }

    @GetMapping
    public ResponseEntity<List<PreparationResponse>> getByStatus(
            @RequestParam(name = "status") String status) {

        List<PreparationStatus> statuses = Arrays.stream(status.split(","))
                .map(String::trim)
                .map(this::parseStatus)
                .toList();

        List<Preparation> preparations = preparationService.getByStatus(statuses);

        List<PreparationResponse> response = preparations.stream()
                .map(PreparationResponse::from)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{preparationId}")
    public ResponseEntity<PreparationResponse> getById(
            @PathVariable UUID preparationId) {

        Preparation preparation = preparationService.getById(preparationId);
        return ResponseEntity.ok(PreparationResponse.from(preparation));
    }

    @PatchMapping("/{preparationId}/items/{itemId}/start")
    public ResponseEntity<PreparationResponse> startItem(
            @PathVariable UUID preparationId,
            @PathVariable UUID itemId) {

        Preparation preparation = preparationService.startItem(preparationId, itemId);
        return ResponseEntity.ok(PreparationResponse.from(preparation));
    }

    @PatchMapping("/{preparationId}/items/{itemId}/complete")
    public ResponseEntity<PreparationResponse> completeItem(
            @PathVariable UUID preparationId,
            @PathVariable UUID itemId) {

        Preparation preparation = preparationService.completeItem(preparationId, itemId);
        return ResponseEntity.ok(PreparationResponse.from(preparation));
    }

    private PreparationStatus parseStatus(String value) {
        return switch (value) {
            case "Pending", "PENDING" -> PreparationStatus.PENDING;
            case "InProgress", "IN_PROGRESS" -> PreparationStatus.IN_PROGRESS;
            case "Ready", "READY" -> PreparationStatus.READY;
            default -> throw new IllegalArgumentException("Unknown status: " + value);
        };
    }
}
