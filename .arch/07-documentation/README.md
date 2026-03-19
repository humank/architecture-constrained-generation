# Phase 7 Documentation -- Coffeeshop Management System

## Overview

Architecture documentation for the Coffeeshop Management System, a microservices-based platform running on AWS EKS with 4 bounded contexts, SNS/SQS messaging, RDS PostgreSQL persistence, and S3+CloudFront frontend delivery.

## C4 Architecture Diagrams

| Level | Diagram | Description |
|-------|---------|-------------|
| L1 | [C4 Context](c4/c4-1-context.md) | System boundary, actors, and external systems |
| L2 | [C4 Container](c4/c4-2-container.md) | Frontend SPA, API Gateway, services, databases, messaging |
| L3 | [C4 Component -- Ordering](c4/c4-3-ordering.md) | Internal components of the Ordering service |
| L3 | [C4 Component -- Preparation](c4/c4-3-preparation.md) | Internal components of the Preparation service |

## Domain Models

| Bounded Context | Diagram | Key Aggregates |
|-----------------|---------|----------------|
| Ordering | [Domain Model](domain/domain-model-ordering.md) | Order, OrderItem, Money |
| Preparation | [Domain Model](domain/domain-model-preparation.md) | Preparation, PreparationItem, Recipe |
| Inventory | [Domain Model](domain/domain-model-inventory.md) | InventoryItem, Replenishment |

## Sequence Diagrams

| Flow | Diagram | Description |
|------|---------|-------------|
| Order Lifecycle | [Sequence](sequence/sequence-order-lifecycle.md) | End-to-end order flow across all services |
| Replenishment | [Sequence](sequence/sequence-replenishment.md) | Low-stock detection through delivery |

## State Machines

| Entity | Diagram | States |
|--------|---------|--------|
| Order | [State Machine](state/state-order.md) | Placed, Confirmed, Paid, Ready, Delivered, Completed |
| Preparation | [State Machine](state/state-preparation.md) | Pending, InProgress, Ready (+ item-level states) |
| Replenishment | [State Machine](state/state-replenishment.md) | Requested, PurchaseOrdered, Delivered |
