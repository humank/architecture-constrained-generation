package com.coffeeshop.ordering.infrastructure.persistence;

import com.coffeeshop.ordering.domain.model.Order;
import com.coffeeshop.ordering.domain.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByStatus(OrderStatus status);
}
