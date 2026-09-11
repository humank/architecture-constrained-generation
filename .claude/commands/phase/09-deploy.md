---
description: "Phase 9: Deploy and Verify — deploy IaC and services, replay MVP domain stories against the live environment"
id: 09-deploy
ordinal: 12
step: all
gate: human
requires_lock: assessment-2
consumes:
  - services/
  - iac/
  - .arch/05-delivery/pipeline.yaml
  - .arch/01-discovery/domain-stories/
produces:
  - .arch/08-implementation/implementation-report.md
sensors: [files-exist, decision-not-restated, e2e-story-coverage]
---

# Phase 9: Deploy and Verify

You deploy the system designed in Phases 0–8 and prove it in the target environment.

The engine owns completion. After work, run:

```bash
bun engine/src/acg.ts report --phase 09-deploy --result awaiting-approval
```

Do not declare success in prose.

## Inputs

- Locked `.arch/assessment-2.yaml` (region, deployment target). Every place the profile pins the region MUST match `answers.region`, or read it via `acg.ts locked-answer`, or the `decision-not-restated` sensor fails. On `deployment_target: on-prem | none` it reports `na` instead.
- MVP domain stories (`DS-*` with covers pointing at MVP user stories).
- Phase 5 pipeline Stage 8 (post-deployment verification).

## Process

1. Confirm `bun engine/src/acg.ts status` cursor is `09-deploy`.
2. Deploy IaC and services using the locked region (never a hardcoded override unless recorded as a redo of assessment-2).
3. Health-check every BC through the real ingress/ALB, not localhost.
4. **Replay each MVP domain story** (`DS-01`, `DS-02`, …) against CloudFront/ALB. The smoke list is the story list — do not invent a parallel `place → confirm → pay` checklist.
5. Error resilience: scale a depended-on service to 0 and check that DST actor `error_state` from Actor Views appears.
6. Write `.arch/08-implementation/implementation-report.md` with per-story pass/fail.
7. `report --result awaiting-approval`. If `decision-not-restated` or story replay fails, the engine refuses `[x]`.

## Definition of Done

The system is not complete until every MVP `DS-*` story passes on the deployed URL and region matches the locked assessment.
