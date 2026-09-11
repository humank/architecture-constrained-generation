# ACG breadcrumb

Written before manual compaction at 2026-09-06T15:22:42.197Z.

Do not infer the current phase from directory listings. Run:

```bash
bun engine/src/acg.ts next --json
```

## Board at compaction time

```
ACG engine  project=coffeeshop  scope=system
cursor: 01a-dst (revising)

[x] 00-requirements        Requirements
[R] 01a-dst                Domain Storytelling  story-map-coverage,story-map-coverage
[x] 01b-storm              Event Storming
[R] 01c-model              Event Modeling  swimlane-is-story,swimlane-is-story,swimlane-is-story,swimlane-is-story
[R] 02-strategic           Strategic Design  assessment-lock
[R] 03-tactical            Tactical Design  actor-view-sourced-from-dst,cl-contract
[x] 03c-ux-design          UX Design
[R] 04-specification       Specification  gherkin-actor-matches-dst,gherkin-actor-matches-dst,gherkin-actor-matches-dst,gherkin-actor-matches-dst,gherkin-actor-matches-dst,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage,cl-contract
[R] 05-delivery            Delivery  assessment-lock,region-fingerprint,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage
[R] 06-review              Architecture Review  docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin,glossary-origin  review:pending
[R] 07-documentation       Documentation  docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm,docs-events-match-storm
[R] 08-implementation      Implementation  assessment-lock,files-exist,spring-boot-matrix,source-fingerprint,source-fingerprint,source-fingerprint,source-fingerprint,source-fingerprint,cl-contract  review:pending
[R] 09-deploy              Deploy and Verify  assessment-lock,region-fingerprint,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage,e2e-story-coverage

locks: assessment-2:locked assessment-8:locked
```

Cursor: 01a-dst (revising)

## Sensors that keep rejecting

- 01a-dst / glossary-origin — 35× — DS-02 discovered "Purchase Order", which is missing from the glossary
- 03-tactical / actor-view-sourced-from-dst — 15× — Barista / Replenishment (/barista/inventory/replenish) path is missing from frontend/src/router.tsx
- 06-review / docs-events-match-storm — 14× — .arch/07-documentation/sequence/sequence-order-lifecycle.md: event-like name "InventoryDeducted" is not in event-storm.yaml
- 08-implementation / source-fingerprint — 12× — No end-to-end test file is named after DS-02 (searched 3 test file(s))
- 04-specification / gherkin-actor-matches-dst — 5× — .arch/04-specification/features/ordering.feature: "When the cashier places an order for Table 1 with the following items:" treats PlaceOrder as Counter Staff, but Event Storm / DST actor is Waiter
- 08-implementation / cl-contract — 4× — CL-1: api_contract "GET /api/preparations?status={value}" has 1 query param(s) not typed semantic_filter or enum_literal (CL-1 requires the distinction)
- 04-specification / e2e-story-coverage — 3× — DS-02 is not listed in pipeline.yaml smoke stories
- 03-tactical / cl-contract — 2× — CL-1 ("Query parameter semantics") has no scenario or contract in Phase 4 and does not declare current_status: "Not applicable"
- 05-delivery / region-fingerprint — 2× — Region mismatch — assessment lock and infrastructure do not agree (.arch/assessment-2.yaml=ap-east-2; .arch/05-delivery/deployment-strategy.yaml=ap-east-2; iac/config/staging.ts=us-east-1; iac/config/production.ts=us-east-1; scripts/deploy.sh=<derived from lock>)
- 08-implementation / spring-boot-matrix — 2× — Spring Boot mismatch: gradle=3.4.4 requested=spring-boot-4.x resolved=
