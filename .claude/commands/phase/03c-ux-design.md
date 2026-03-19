---
description: "Phase 3c: UX Design — Visual design system generation using ui-ux-pro-max, constrained by DDD actor views and tech stack"
---

# Phase 3c: UX Design

You are a UX design expert. You translate the actor views and API contract from Phase 3 into a complete visual design system using the **ui-ux-pro-max** skill. The domain model drives what users see and do; this phase decides **how it looks and feels**.

## Prerequisite

This phase requires the [ui-ux-pro-max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) to be installed. Verify:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "test" --domain style -n 1
```

If not installed, inform the user:
> "Phase 3c requires the ui-ux-pro-max skill. Install it with:
> `npx uipro-cli install` or follow https://github.com/nextlevelbuilder/ui-ux-pro-max-skill"

## DDD Alignment Principle

**The domain model constrains the UX, not the other way around.**

- Actor views (Phase 3 Step 8b) define WHAT each screen contains — the UX skill decides HOW it looks
- API contract endpoints are fixed — the design system wraps them in beautiful UI
- Ubiquitous Language from the glossary drives all labels, headings, and microcopy
- BC boundaries are respected — each BC's UI can have distinct visual emphasis but shares the design system

```
Phase 3 (DDD)                    Phase 3c (UX)                     Phase 8 (Code)
─────────────                    ──────────────                    ──────────────
Actor Views        ──────────►   Design System       ──────────►   React Components
 (what + data)                    (how it looks)                    (implementation)
API Contract       ──────────►   Page Overrides      ──────────►   Tailwind Classes
 (endpoints)                      (per-actor style)                 shadcn/ui Config
Component List     ──────────►   Component Specs     ──────────►   Component Variants
 (organisms)                      (states, tokens)                  (props, styles)
```

## Input — Read Before Starting

From previous phases:
- `.arch/03-tactical/frontend-architecture.yaml` — actor views, component list, API contract
- `.arch/02-strategic/bounded-contexts.yaml` — BC classification (Core/Supporting/Generic)
- `.arch/00-requirements/parsed-requirements.yaml` — business domain, industry, target users
- `.arch/glossary.yaml` — Ubiquitous Language for all UI labels
- `.arch/assessment-8.md` — Frontend framework (Q9), CSS framework (Q12), component library (Q13)

## Pre-Design: Assessment Check

If `.arch/assessment-8.md` does not contain answers for Q12 (CSS Framework), Q13 (Component Library), and Q14 (Visual Style Direction), generate those questions now using the assessment utility template.

**Industry default stack (2024+): Tailwind CSS + shadcn/ui.**

This combination is the default because:
- Design tokens from ui-ux-pro-max map 1:1 to `tailwind.config.ts` entries
- shadcn/ui copies components into your codebase (full ownership, not a black-box npm dependency)
- shadcn/ui is built on Radix UI (best-in-class accessibility primitives)
- Next.js / Vercel / v0.dev ecosystem all converge on this stack
- Only deviate if there's a specific reason (legacy project, Material Design requirement, Vue ecosystem)

### Q12: CSS Framework
**Category**: TECHNOLOGY
**Context**: Determines how design tokens translate to code. Must be compatible with Q9 (Frontend Framework).

**Options**:
- A) **Tailwind CSS** → Utility-first, design tokens map directly to config. Industry default. *Recommended.*
- B) **CSS Modules** → Scoped CSS, no built-in token system. Only if team has strong CSS-first preference.
- C) **styled-components / Emotion** → Runtime CSS-in-JS, **being phased out** (RSC incompatible). Legacy only.
- D) **Vanilla Extract** → Zero-runtime CSS-in-TS. Good tech but small ecosystem, shadcn/ui unsupported.

**Answer**: <!-- A-D (default: A) -->

### Q13: Component Library
**Category**: TECHNOLOGY
**Context**: Pre-built accessible components. Must be compatible with Q9 and Q12.

**Options (React + Tailwind)**:
- A) **shadcn/ui** → Copy-paste into your codebase (Radix UI + Tailwind). Full ownership, best a11y. *Industry default.*
- B) **Radix UI (unstyled)** → Accessible primitives only, you style everything.
- C) **Headless UI** → Tailwind Labs, fewer components but well-integrated.

**Options (React + CSS-in-JS)**:
- D) **MUI (Material UI)** → Full component suite, Material Design. Best for: enterprise/admin.
- E) **Ant Design** → Enterprise-focused, rich data components. Best for: admin panels.
- F) **Chakra UI** → Simple, accessible, modular. Best for: quick prototyping.

**Options (Vue)**:
- G) **Vuetify** → Material Design for Vue. Best for: Vue + Material.
- H) **Naive UI** → TypeScript-first Vue components.

**Answer**: <!-- A-H (default: A for React+Tailwind) -->

### Q14: Visual Style Direction
**Category**: DESIGN
**Context**: Guides the ui-ux-pro-max design system generation. Can be overridden by the reasoning engine.

**Options**:
- A) **Let ui-ux-pro-max recommend** → Best match for your product type and industry. *Recommended.*
- B) **Minimalism** → Clean, content-first, generous whitespace.
- C) **Glassmorphism** → Frosted glass, blur, transparency, modern feel.
- D) **Soft UI / Neumorphism** → Subtle shadows, soft depth, premium feel.
- E) **Brutalism** → Bold, raw, unconventional. Best for: creative/agency.
- F) **Dark Mode First** → Dark surfaces, vibrant accents.
- G) **Bento Grid** → Grid-based dashboard layouts with cards.
- H) **Custom** → User specifies style keywords (write in answer).

**Answer**: <!-- A-H (default: A) -->

## Process

### Step 1: Extract Design Context from DDD Artifacts

From the architecture artifacts, extract:

1. **Product type and industry** (from `parsed-requirements.yaml`):
   - What type of product is this? (SaaS, e-commerce, dashboard, service app, etc.)
   - What industry? (fintech, healthcare, food & beverage, etc.)
   - Who are the target users? (internal staff, consumers, B2B, etc.)

2. **Actor roles and their context** (from `frontend-architecture.yaml` actor_views):
   - Each actor's environment (waiter on the floor with tablet? manager at desk? customer on phone?)
   - Urgency level per actor (barista needs quick glance vs. manager reviewing reports)
   - Information density per view (order form = focused, dashboard = data-dense)

3. **Style keywords** — derive from domain:
   - Food & beverage → warm, inviting, clean
   - Fintech → trustworthy, professional, precise
   - Healthcare → calming, accessible, clear
   - Internal tool → efficient, data-dense, functional

### Step 2: Generate Design System via ui-ux-pro-max

Run the design system generator with context extracted from Step 1:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "<product_type> <industry> <style_keywords>" \
  --design-system \
  -p "<project_name>"
```

**Example for coffeeshop:**
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "food service restaurant POS clean warm" \
  --design-system \
  -p "CoffeeShop"
```

**If Q14 specifies a style direction**, add it to the query:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "food service restaurant POS minimalism warm" \
  --design-system \
  -p "CoffeeShop"
```

**Capture the output**: pattern, style, colors, typography, effects, anti-patterns.

### Step 3: Generate Per-Actor Page Overrides

For each actor view that needs distinct emphasis, generate a page-specific override:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "<product_type> <industry> <style_keywords>" \
  --design-system --persist \
  -p "<project_name>" \
  --page "<actor_page>"
```

**Actor-specific considerations:**

| Actor Context | Design Emphasis | ui-ux-pro-max Query Modifier |
|---|---|---|
| High-urgency operator (barista, kitchen) | Large touch targets, high contrast, minimal chrome | `"dashboard POS high-contrast minimal"` |
| Data-review role (manager, analyst) | Dense tables, charts, filters | `"admin dashboard data-dense"` |
| Customer-facing (waiter, receptionist) | Warm, inviting, quick interactions | `"service app clean warm friendly"` |
| Self-service (customer kiosk) | Large text, guided flow, accessibility | `"kiosk self-service accessible"` |

### Step 4: Supplement with Domain-Specific Searches

Run additional targeted searches as needed:

```bash
# Color palette refinement
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<industry> <mood>" --domain color

# Typography for the domain
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<mood> <personality>" --domain typography

# UX patterns for key interactions
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "form loading animation" --domain ux

# Chart recommendations (if dashboard views exist)
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "real-time dashboard" --domain chart
```

### Step 5: Stack-Specific Guidelines

Based on assessment Q9 (frontend framework), get implementation guidance:

```bash
# React-specific
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "performance navigation" --stack react

# Or for the specific stack chosen
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<key_concern>" --stack <stack>
```

### Step 6: Map Design System to DDD Components

Bridge the design system output to the actor views and components from Phase 3:

**For each actor view section (from `frontend-architecture.yaml`):**

| Actor View Section | Component Type | Design System Mapping |
|---|---|---|
| Form sections | Organisms | Form field tokens + validation states + submit button style |
| Data tables | Organisms | Table tokens + row hover + sort indicators + status badges |
| Card grids | Organisms | Card elevation + spacing + action button placement |
| Status displays | Molecules | Badge color mapping to domain enum values (e.g., OrderStatus → color) |
| Navigation | Template | Sidebar vs bottom nav based on actor device context |

**Domain enum → Visual mapping:**
```yaml
status_color_mapping:
  # Map domain state machine states to semantic color tokens
  OrderStatus:
    PLACED: "info"         # blue
    CONFIRMED: "info"      # blue
    PAID: "success"        # green
    PREPARING: "warning"   # amber
    READY: "success"       # green
    DELIVERED: "success"   # green
    COMPLETED: "muted"     # gray
    CANCELLED: "destructive" # red
  PreparationStatus:
    QUEUED: "info"
    IN_PROGRESS: "warning"
    DONE: "success"
```

**UI state visual design (MANDATORY — loading, error, empty):**
```yaml
ui_states:
  loading:
    skeleton_color: "muted"       # Use muted background for skeleton loaders
    animation: "pulse"             # CSS animation for loading placeholders
    description: "Skeleton loaders matching content shape (table rows, cards, etc.)"
  error:
    color: "destructive"           # Red/error color token
    border: "2px solid destructive"
    icon: "AlertCircle"
    description: "Error banner with icon + plain-language message + retry button"
    accessibility: "role='alert', aria-live='assertive' — announced to screen readers"
    must_identify: "Which backend service failed (name + port for debugging)"
  empty:
    color: "muted-foreground"
    icon: "Context-dependent (Package for inventory, Coffee for orders, etc.)"
    description: "Centered illustration/icon + helpful text + call-to-action if applicable"
```
**Every actor view page MUST define what it shows in all three states.** This is consumed by Phase 8 to generate three-state rendering for every page component.

### Step 7: Validate Design Decisions

Run the ui-ux-pro-max pre-delivery checklist adapted for DDD:

**Accessibility check:**
- [ ] All form fields from actor view sections have visible labels (not placeholder-only)
- [ ] Domain status badges use color + text/icon (not color alone)
- [ ] Touch targets ≥ 44px for all command action buttons
- [ ] Contrast ratio ≥ 4.5:1 for all text on chosen color palette
- [ ] Error state text contrast ≥ 4.5:1 against error background
- [ ] Error messages use `role="alert"` and `aria-live="assertive"` for screen reader announcement

**Frontend resilience check:**
- [ ] `ui_states` section defines loading, error, and empty state visual treatment
- [ ] Every actor view page specifies what each state looks like
- [ ] Error states identify which service failed (not just generic "something went wrong")
- [ ] Loading states use skeleton loaders (not just spinner) matching content shape

**DDD alignment check:**
- [ ] Component names use Ubiquitous Language from glossary
- [ ] No visual elements imply cross-BC relationships that don't exist in the domain
- [ ] Actor-scoped navigation matches the actor_views routing
- [ ] Read model data display matches the query endpoint response DTO shapes

**Style consistency check:**
- [ ] All pages share the same design system tokens (MASTER.md)
- [ ] Page overrides only deviate where actor context demands it
- [ ] No mixing of conflicting styles (e.g., glassmorphism + brutalism)

## Output

### `design-system/MASTER.md`
Global design system source of truth. Generated by ui-ux-pro-max `--persist` flag. Contains:
- Pattern (page structure recommendation)
- Style (visual language)
- Colors (primary, secondary, CTA, background, text + semantic tokens)
- Typography (heading + body font pairing, scale)
- Effects (shadows, transitions, hover states)
- Anti-patterns to avoid
- Pre-delivery checklist

### `design-system/pages/{actor-page}.md` (one per actor view)
Page-specific overrides from MASTER. Only contains deviations.

### `.arch/03c-ux-design/ux-design-report.yaml`
```yaml
design_system:
  style: "Minimalism"
  color_palette:
    primary: "#4A6741"
    secondary: "#D4A574"
    cta: "#2D5016"
    background: "#FAFAF5"
    text: "#1A1A1A"
  typography:
    heading: "DM Serif Display"
    body: "Inter"
    scale: [12, 14, 16, 18, 24, 32, 48]
  effects:
    shadow: "soft"
    transition: "200-300ms ease-out"
    border_radius: "8px"

  component_library: "shadcn/ui"     # from assessment Q13
  css_framework: "Tailwind CSS"       # from assessment Q12
  icon_library: "Lucide"             # recommended by ui-ux-pro-max

actor_view_overrides:
  - actor: "barista"
    page: "BaristaPreparationPage"
    overrides:
      emphasis: "high-contrast, large touch targets"
      density: "sparse — one card per preparation item"
  - actor: "manager"
    page: "ManagerDashboardPage"
    overrides:
      emphasis: "data-dense, chart-heavy"
      density: "compact — tables with sort/filter"

status_color_mapping:
  OrderStatus:
    PLACED: "info"
    CONFIRMED: "info"
    PAID: "success"
    PREPARING: "warning"
    READY: "success"
    DELIVERED: "success"
    COMPLETED: "muted"
  PreparationStatus:
    QUEUED: "info"
    IN_PROGRESS: "warning"
    DONE: "success"

accessibility:
  wcag_level: "AA"
  min_contrast: "4.5:1"
  min_touch_target: "44px"
  reduced_motion: true
  dark_mode: false        # or true based on Q14

validation:
  - "✅ All actor view labels use glossary terms"
  - "✅ Status badges use color + text"
  - "✅ Touch targets ≥ 44px on all action buttons"
  - "✅ Contrast ≥ 4.5:1 verified"
```

### `.arch/glossary.yaml`
Updated with any new UI terms (e.g., design token names mapped to domain concepts).

## Completion

Present:

```
## Phase 3c: UX Design Complete

### Design System
- Style: {style} (recommended by ui-ux-pro-max for {product_type})
- Colors: {primary} / {secondary} / {cta} (from {industry} palette)
- Typography: {heading} / {body}
- Component Library: {library} (from assessment Q13)
- CSS Framework: {framework} (from assessment Q12)

### Actor View Styling
- {actor1}: {emphasis} — {page_override_summary}
- {actor2}: {emphasis} — {page_override_summary}

### Domain → Visual Mapping
- {N} domain enum → color mappings
- {N} form sections with validation states defined
- {N} data table sections with sort/filter styling

### Accessibility
- WCAG {level} compliance targeted
- All {N} action buttons ≥ 44px touch target
- Contrast verified: {ratio} minimum

### Files Generated
- design-system/MASTER.md
- design-system/pages/{page1}.md
- design-system/pages/{page2}.md
- .arch/03c-ux-design/ux-design-report.yaml
```

$ARGUMENTS
