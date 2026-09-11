# ACG breadcrumb

Written before auto compaction at 2026-09-11T16:09:00.409Z.

Do not infer the current phase from directory listings. Run:

```bash
bun engine/src/acg.ts next --json
```

## Board at compaction time

```
ACG engine  project=coffeeshop  scope=system
cursor: 04-specification (revising)

[x] 00-requirements        Requirements
[x] 01a-dst                Domain Storytelling
[x] 01b-storm              Event Storming
[x] 01c-model              Event Modeling
[x] 02-strategic           Strategic Design
[x] 03-tactical            Tactical Design
[x] 03c-ux-design          UX Design
[R] 04-specification       Specification  gherkin-actor-matches-dst×8
[R] 05-delivery            Delivery  decision-not-restated
[R] 06-review              Architecture Review  docs-events-match-storm×7  review:pending
[R] 07-documentation       Documentation  docs-events-match-storm×14
[R] 08-implementation      Implementation  framework-version-matrix source-fingerprint×14 commands-implemented×12  review:pending
[R] 09-deploy              Deploy and Verify  decision-not-restated

locks: assessment-2:locked assessment-8:locked
```

Cursor: 04-specification (revising)

## Sensors that keep rejecting

- 03-tactical / actor-view-sourced-from-dst — 50× — Barista / Replenishment (/barista/inventory/replenish) path is missing from frontend/src/router.tsx
- 06-review / docs-events-match-storm — 42× — .arch/07-documentation/sequence/sequence-order-lifecycle.md: event-like name "InventoryDeducted" is not in event-storm.yaml
- 08-implementation / source-fingerprint — 40× — No end-to-end test file is named after DS-02 (searched 21 test file(s))
- 04-specification / gherkin-actor-matches-dst — 39× — .arch/04-specification/features/ordering.feature: "When the cashier places an order for Table 1 with the following items:" treats PlaceOrder as Counter Staff, but Event Storm / DST actor is Waiter
- 01a-dst / glossary-origin — 35× — DS-02 discovered "Purchase Order", which is missing from the glossary
- 07-documentation / docs-events-match-storm — 28× — .arch/07-documentation/sequence/sequence-order-lifecycle.md: event-like name "InventoryDeducted" is not in event-storm.yaml
- 08-implementation / cl-contract — 4× — CL-1: api_contract "GET /api/preparations?status={value}" has 1 query param(s) not typed semantic_filter or enum_literal (CL-1 requires the distinction)
- 08-implementation / spring-boot-matrix — 4× — Spring Boot mismatch: gradle=3.4.4 requested=spring-boot-4.x resolved=
- 04-specification / e2e-story-coverage — 3× — DS-02 is not listed in pipeline.yaml smoke stories
- 05-delivery / region-fingerprint — 3× — Region mismatch — assessment lock and infrastructure do not agree (.arch/assessment-2.yaml=ap-east-2; .arch/05-delivery/deployment-strategy.yaml=ap-east-2; iac/config/staging.ts=us-east-1; iac/config/production.ts=us-east-1; scripts/deploy.sh=<derived from lock>)
- 03-tactical / cl-contract — 2× — CL-1 ("Query parameter semantics") has no scenario or contract in Phase 4 and does not declare current_status: "Not applicable"
- 04-specification / test-stack-matrix — 2× — .arch/04-specification/test-strategy.yaml names pytest, which is not in the locked test_stack "vitest-testing-library-playwright" and cannot run java-21 — "- framework: Jest (TypeScript) or pytest (Python)"
