# Chapter 7: Phase 3c — UX Design

> *"The domain model constrains the UX, not the other way around."*

---

## Domain-Driven Visual Design

Phase 3c bridges the gap between what the domain says users should see (actor views from Phase 3) and how it actually looks and feels. The key principle:

```
Phase 3 (DDD)                    Phase 3c (UX)                     Phase 8 (Code)
─────────────                    ──────────────                    ──────────────
Actor Views        ──────────▶   Design System       ──────────▶   React Components
 (what + data)                    (how it looks)                    (implementation)
API Contract       ──────────▶   Page Overrides      ──────────▶   Tailwind Classes
 (endpoints)                      (per-actor style)                 shadcn/ui Config
Component List     ──────────▶   Component Specs     ──────────▶   Component Variants
 (organisms)                      (states, tokens)                  (props, styles)
```

The DDD artifacts define **WHAT** each screen contains. Phase 3c decides **HOW** it looks.

---

## Design System Generation

The design system is generated based on context extracted from DDD artifacts:

| Input | Design Decision |
|---|---|
| Product type (from requirements) | Overall pattern (dashboard, POS, e-commerce) |
| Industry (food & beverage) | Color mood (warm, inviting, clean) |
| Actor context (barista on floor) | Touch targets, contrast, information density |
| Domain enums (OrderStatus) | Status → color mapping |

### Industry-Driven Style

| Industry | Style Keywords | Color Mood |
|---|---|---|
| Food & beverage | Warm, inviting, clean | Earth tones, greens |
| Fintech | Trustworthy, professional, precise | Blues, grays |
| Healthcare | Calming, accessible, clear | Soft blues, whites |
| Internal tool | Efficient, data-dense, functional | Neutral, high contrast |

---

## Status → Color Mapping

Domain state machines map directly to visual tokens:

```yaml
status_color_mapping:
  OrderStatus:
    PLACED: "info"           # blue
    CONFIRMED: "info"        # blue
    PAID: "success"          # green
    PREPARING: "warning"     # amber
    READY: "success"         # green
    DELIVERED: "success"     # green
    COMPLETED: "muted"       # gray
    CANCELLED: "destructive" # red
  PreparationStatus:
    QUEUED: "info"
    IN_PROGRESS: "warning"
    DONE: "success"
```

This mapping ensures that status badges throughout the application are consistent and meaningful.

---

## Per-Actor Page Overrides

Different actors have different environmental contexts that demand different design emphasis:

| Actor Context | Design Emphasis | Rationale |
|---|---|---|
| Barista (standing, glancing) | Large touch targets, high contrast, sparse | Quick glance workflow |
| Manager (sitting, analyzing) | Dense tables, charts, filters | Data review workflow |
| Waiter (moving between tables) | Quick interactions, clean forms | Speed-focused workflow |
| Customer kiosk | Large text, guided flow, accessible | Self-service, accessibility |

---

## Mandatory Three-State Design

**Every actor view page MUST define visual treatment for three states:**

```yaml
ui_states:
  loading:
    visual: "Skeleton loaders matching content shape"
    animation: "pulse"
    color: "muted background"

  error:
    visual: "Error banner with icon + message + retry button"
    color: "destructive"
    accessibility: "role='alert', aria-live='assertive'"
    must_identify: "Which backend service failed"

  empty:
    visual: "Centered illustration + helpful text + CTA"
    color: "muted-foreground"
    icon: "Context-dependent"
```

This isn't optional. Quality gates verify that every page handles all three states — because backend services **will** be unavailable, and the frontend must handle it gracefully.

---

## Accessibility by Default

| Requirement | Target |
|---|---|
| WCAG level | AA minimum |
| Contrast ratio | ≥ 4.5:1 for all text |
| Touch targets | ≥ 44px for all action buttons |
| Status indicators | Color + text/icon (never color alone) |
| Error announcements | `role="alert"`, `aria-live="assertive"` |
| Reduced motion | Respect `prefers-reduced-motion` |

---

## Technology Stack Alignment

Phase 3c aligns with the assessment-8 technology choices:

| Assessment Choice | Design System Integration |
|---|---|
| **Tailwind CSS** (Q12) | Design tokens → `tailwind.config.ts` entries |
| **shadcn/ui** (Q13) | Components → CSS variable theming |
| **Lucide icons** | Icon library for status indicators |

The default stack (Tailwind + shadcn/ui) was chosen because design tokens map 1:1 to Tailwind config — no manual bridging needed.

---

## Output Artifacts

```
design-system/
├── MASTER.md                        # Global design system (colors, typography, effects)
└── pages/
    ├── WaiterOrderPage.md           # Waiter-specific overrides
    ├── BaristaPreparationPage.md    # Barista-specific overrides
    └── ManagerDashboardPage.md      # Manager-specific overrides

.arch/03c-ux-design/
└── ux-design-report.yaml            # Complete design decisions, status mapping, accessibility
```

---

[← Previous: Phase 3 — Tactical Design](./06-phase-3-tactical-design.md) | [Table of Contents](./README.md) | [Next: Phase 4 — Specification →](./08-phase-4-specification.md)
