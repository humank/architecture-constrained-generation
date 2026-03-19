package com.coffeeshop.preparation.application;

import com.coffeeshop.preparation.domain.event.PreparationStarted;
import com.coffeeshop.preparation.domain.model.Preparation;
import com.coffeeshop.preparation.domain.model.PreparationItem;
import com.coffeeshop.preparation.domain.model.PreparationStatus;
import com.coffeeshop.preparation.domain.service.RecipeResolutionService;
import com.coffeeshop.preparation.infrastructure.messaging.PreparationEventPublisher;
import com.coffeeshop.preparation.infrastructure.persistence.PreparationRepository;
import com.coffeeshop.shared.domain.DomainEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PreparationService {

    private final PreparationRepository preparationRepository;
    private final RecipeResolutionService recipeResolutionService;
    private final PreparationEventPublisher eventPublisher;

    public PreparationService(PreparationRepository preparationRepository,
                              RecipeResolutionService recipeResolutionService,
                              PreparationEventPublisher eventPublisher) {
        this.preparationRepository = preparationRepository;
        this.recipeResolutionService = recipeResolutionService;
        this.eventPublisher = eventPublisher;
    }

    public Preparation createPreparation(UUID orderId, int tableNumber, List<PreparationItem> items) {
        Preparation preparation = Preparation.createFromOrder(orderId, tableNumber, items);
        return preparationRepository.save(preparation);
    }

    public Preparation startItem(UUID preparationId, UUID itemId) {
        Preparation preparation = findById(preparationId);
        PreparationStarted event = preparation.startItem(itemId, recipeResolutionService);
        preparationRepository.save(preparation);
        eventPublisher.publish(event);
        return preparation;
    }

    public Preparation completeItem(UUID preparationId, UUID itemId) {
        Preparation preparation = findById(preparationId);
        List<DomainEvent> events = preparation.completeItem(itemId);
        preparationRepository.save(preparation);
        for (DomainEvent event : events) {
            eventPublisher.publish(event);
        }
        return preparation;
    }

    @Transactional(readOnly = true)
    public List<Preparation> getByStatus(List<PreparationStatus> statuses) {
        return preparationRepository.findByStatusIn(statuses);
    }

    @Transactional(readOnly = true)
    public Preparation getById(UUID preparationId) {
        return findById(preparationId);
    }

    private Preparation findById(UUID preparationId) {
        return preparationRepository.findById(preparationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Preparation not found: " + preparationId));
    }
}
