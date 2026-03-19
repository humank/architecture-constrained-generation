# Architecture Perspectives

## 1. Security

### Current Status

- **Transport**: All external traffic over HTTPS (ALB terminates TLS, CloudFront enforces HTTPS).
- **Authentication**: JWT-based authentication via Amazon Cognito for staff-facing APIs.
- **Authorization**: Role-based access control (RBAC) with roles: Customer, Waiter, CounterStaff, Barista, Admin.
- **Network**: Services in private subnets; no direct internet access. NAT Gateway for outbound.
- **Secrets**: Managed via AWS Secrets Manager, injected as Kubernetes secrets.
- **Database**: IAM-based RDS authentication; schema-level GRANT restrictions per service user.
- **Messaging**: SQS/SNS access controlled via IAM policies scoped to each service's pod identity (IRSA).

### Recommendations

- Enable AWS WAF on ALB and CloudFront to block common attack patterns (SQLi, XSS).
- Implement API rate limiting at ALB level to prevent abuse.
- Add dependency vulnerability scanning (Dependabot + Trivy for container images) to CI pipeline.
- Rotate database credentials automatically via Secrets Manager rotation lambda.

---

## 2. Performance

### Current Status

- **API latency target**: p99 < 500ms for order placement.
- **Database**: RDS gp3 storage provides baseline 3000 IOPS. Connection pooling via HikariCP (10 connections per pod).
- **Caching**: No application-level caching currently. Reporting projections are pre-computed.
- **Frontend**: S3 + CloudFront with edge caching for static assets.

### Recommendations

- Add ElastiCache (Redis) for menu/recipe data caching in Preparation Service to reduce RDS load.
- Implement database query performance monitoring via RDS Performance Insights.
- Add connection pooling with PgBouncer sidecar if connection count becomes a bottleneck.
- Consider read replicas for Reporting Service if query load increases.

---

## 3. Availability

### Current Status

- **Compute**: EKS with multi-AZ worker nodes; minimum 2 replicas per service.
- **Database**: RDS Multi-AZ with automatic failover.
- **Messaging**: SNS and SQS are fully managed, multi-AZ by default.
- **Frontend**: CloudFront provides global edge availability with S3 origin.
- **Target**: 99.9% availability for Ordering Service (43 min/month downtime budget).

### Recommendations

- Implement pod disruption budgets (PDB) to ensure at least 1 replica is always available during node drains.
- Add health check endpoints (liveness + readiness probes) with dependency checks.
- Configure ALB health check grace period to avoid killing slow-starting JVM pods.
- Consider circuit breakers (Resilience4j) for cross-service API calls if synchronous calls are introduced.

---

## 4. Scalability

### Current Status

- **Horizontal**: HPA on CPU utilization for all services. Cluster Autoscaler for node scaling.
- **Database**: Single RDS instance, vertically scalable. Read replicas available if needed.
- **Messaging**: SQS scales automatically; consumer concurrency controlled by pod count and thread count.
- **Design ceiling**: Current architecture supports approximately 500 orders/hour before RDS becomes the bottleneck.

### Recommendations

- Load test to validate the 500 orders/hour estimate and identify the actual bottleneck.
- Plan for CQRS with a dedicated read database if Reporting queries impact transactional workloads.
- Consider SQS FIFO queues with message group IDs if strict per-order ordering becomes necessary.
- Document the scaling playbook: when to add replicas vs. when to upgrade RDS instance class.

---

## 5. Evolution

### Current Status

- **Modularity**: Four bounded contexts with clear ownership boundaries.
- **Coupling**: Loose coupling via async events; no synchronous inter-service calls.
- **Schema**: Flyway-managed migrations allow controlled schema evolution per BC.
- **Extensibility**: New bounded contexts can subscribe to existing SNS topics without modifying producers.

### Recommendations

- Establish a schema registry or event catalog to track event versions and ensure backward compatibility.
- Use event versioning (e.g., `OrderConfirmed.v1`, `OrderConfirmed.v2`) with consumer-side schema evolution.
- Document the process for introducing a new bounded context (template service, SNS subscription setup, schema creation).
- Consider extracting shared libraries into a separate internal package registry if the team grows.

---

## 6. Accessibility

### Current Status

- **Frontend SPA**: Built with React; basic semantic HTML structure.
- **Kiosk interface**: Touch-optimized layout for customer self-ordering.
- **Staff interface**: Desktop-optimized for counter staff and barista screens.

### Recommendations

- Conduct WCAG 2.1 AA compliance audit on the frontend SPA.
- Add ARIA labels, keyboard navigation support, and screen reader compatibility.
- Ensure color contrast ratios meet accessibility standards (especially for order status indicators).
- Implement focus management for modal dialogs and form flows.

---

## 7. Internationalization (i18n)

### Current Status

- **Primary locale**: zh-TW (Traditional Chinese, Taiwan).
- **Currency**: TWD (New Taiwan Dollar).
- **Timezone**: Asia/Taipei (UTC+8).
- **Frontend**: i18n framework (react-i18next) in place but only zh-TW translations exist.

### Recommendations

- Add en-US translations for potential tourist-facing kiosk mode.
- Ensure all timestamps are stored in UTC and converted to local time at the presentation layer.
- Use ICU message format for pluralization and number formatting.
- Externalize menu item names to support multilingual menus.

---

## 8. Regulation

### Current Status

- **Data privacy**: Customer PII (name, phone) stored only in Ordering schema. No email collection for walk-in customers.
- **Payment data**: No card data stored; payment delegated to external payment gateway (tokenized).
- **Data retention**: Orders retained for 7 years per Taiwan tax regulations.
- **Receipt**: Electronic receipt (e-invoice) integration planned.

### Recommendations

- Implement data anonymization for customer records older than the retention period.
- Add audit logging for access to PII fields.
- Ensure compliance with Taiwan's Personal Data Protection Act (PDPA).
- Integrate with Taiwan e-invoice system (Ministry of Finance) for legal compliance.

---

## 9. Usability

### Current Status

- **Customer flow**: 3-step ordering (select items, confirm, pay) with visual feedback.
- **Barista flow**: Real-time preparation queue with drag-to-reorder and swipe-to-complete.
- **Staff flow**: Order management dashboard with search and filter capabilities.
- **Responsiveness**: SPA is responsive for tablet (kiosk) and desktop (staff) form factors.

### Recommendations

- Conduct usability testing with actual baristas and counter staff to identify workflow friction.
- Add keyboard shortcuts for high-frequency staff actions (e.g., mark order complete).
- Implement optimistic UI updates for order status changes to reduce perceived latency.
- Add sound/vibration notifications for baristas when new orders arrive.

---

## 10. Operability

### Current Status

- **Observability**: CloudWatch (logs, metrics), X-Ray (traces), ADOT collector on every node.
- **Deployment**: ArgoCD GitOps with automatic sync to staging, manual promotion to production.
- **Rollback**: ArgoCD supports instant rollback to previous Git revision.
- **Configuration**: Externalized via Kubernetes ConfigMaps and Secrets; environment-specific via Kustomize overlays.
- **Runbooks**: Documented for common failure scenarios per service.

### Recommendations

- Implement synthetic monitoring (CloudWatch Synthetics) to proactively detect order flow failures.
- Add a chaos engineering practice (AWS Fault Injection Simulator) to validate resilience assumptions.
- Create a single-pane-of-glass operational dashboard combining all services' health indicators.
- Automate DLQ redrive with a self-service tool (Lambda-backed API) instead of requiring AWS Console access.
