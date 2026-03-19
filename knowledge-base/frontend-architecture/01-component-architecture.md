# Frontend Component Architecture

## Atomic Design (Brad Frost)

A methodology for creating design systems by breaking UI into five hierarchical levels.

```
Pages         → Templates filled with real content
Templates     → Page layouts with placeholder slots
Organisms     → Complex, distinct sections of UI
Molecules     → Simple groups of atoms functioning together
Atoms         → Basic HTML elements (irreducible)
```

### The Five Levels

| Level | Definition | Examples | Reusability |
|---|---|---|---|
| **Atoms** | Smallest UI building blocks, single HTML elements | Button, Input, Label, Icon, Avatar | Universal — used everywhere |
| **Molecules** | Simple groups of atoms that form a unit | SearchForm (Input + Button), FormField (Label + Input + Error) | High — used across features |
| **Organisms** | Complex, relatively independent sections | Header (Logo + Nav + SearchForm), ProductCard, CommentThread | Medium — BC-specific |
| **Templates** | Page-level wireframes with placeholder content | DashboardLayout, CheckoutPageTemplate | Low — page-specific |
| **Pages** | Templates instantiated with real data and state | DashboardPage, CheckoutPage | Instance-specific |

### Key Insight

Atoms and molecules form the **design system** (shared, brand-consistent). Organisms and templates are
**application-specific** (tied to features and bounded contexts). Pages are **integration points** where
data meets layout.

### Benefits

- **Consistent design language**: atoms enforce visual consistency across the entire product
- **Reusable component library**: molecules compose atoms; organisms compose molecules — DRY by structure
- **Parallel development**: teams work on different levels simultaneously
- **Testability gradient**: atoms = unit tests, molecules/organisms = integration tests, pages = E2E

---

## Feature-Sliced Design (FSD)

An architectural methodology for frontend applications, organizing code by **business domain** rather than
technical type.

### Layers (top to bottom, strict import direction)

```
app        → Application initialization, providers, global styles, routing
processes  → Complex cross-page workflows (deprecated in FSD v2, merged into features)
pages      → Compositional layer: assembles widgets/features for each route
widgets    → Large self-contained UI blocks (complex organisms)
features   → User interactions that deliver business value (use cases)
entities   → Business domain objects with their UI representation
shared     → Reusable infrastructure: ui-kit, lib, api client, config
```

**Strict import rule**: A layer can only import from layers **below** it. `features/` cannot import from
`widgets/`; `entities/` cannot import from `features/`.

### Segments Within Each Layer

Each slice (e.g., `features/add-to-cart/`) contains standardized segments:

| Segment | Purpose | Example |
|---|---|---|
| **ui** | React components, styles | `AddToCartButton.tsx` |
| **model** | State, stores, selectors, types | `cartModel.ts`, `types.ts` |
| **api** | Data fetching, API calls | `cartApi.ts` |
| **lib** | Utilities specific to this slice | `formatPrice.ts` |
| **config** | Constants, feature flags | `config.ts` |

### Directory Structure Example

```
src/
├── app/           # Global setup: providers, router, styles
├── pages/         # Route-level composition
│   └── checkout/
│       └── ui/CheckoutPage.tsx    # Composes widgets + features
├── widgets/       # Self-contained UI blocks
│   └── order-summary/
│       └── ui/OrderSummary.tsx    # Composes features + entities
├── features/      # User interactions
│   └── add-to-cart/
│       ├── ui/AddToCartButton.tsx
│       ├── model/cartModel.ts
│       └── api/cartApi.ts
├── entities/      # Domain objects
│   └── product/
│       ├── ui/ProductCard.tsx
│       ├── model/types.ts
│       └── api/productApi.ts
└── shared/        # Reusable infrastructure
    ├── ui/        # Design system atoms/molecules
    ├── lib/       # Generic utilities
    ├── api/       # API client, interceptors
    └── config/    # Environment, constants
```

### Connection to Clean Architecture

| FSD Layer | Clean Architecture Equivalent |
|---|---|
| **shared** | Frameworks & Drivers (libraries, API clients) |
| **entities** | Entities (domain model) |
| **features** | Use Cases (application business rules) |
| **widgets/pages** | Interface Adapters (composition, presentation) |
| **app** | Main Component (wiring, initialization) |

The FSD import rule mirrors the **Dependency Rule**: dependencies point inward toward the domain.

### Connection to DDD

- **entities** layer = Domain Model (Aggregates, Value Objects as UI representations)
- **features** layer = Application Services / Use Cases
- Each slice within a layer = potential **Bounded Context module**
- **shared** = Shared Kernel (cross-BC reusable code)

---

## Design System

A design system is the **single source of truth** for UI: tokens, components, patterns, and guidelines.

### Design Tokens

Primitive design decisions stored as platform-agnostic variables.

```
Token Hierarchy:
  Global Tokens  →  Alias Tokens  →  Component Tokens
  blue-500           color-primary      button-bg-primary
  16px               spacing-md         card-padding
  700                font-weight-bold   heading-font-weight
```

| Token Type | Examples | Format |
|---|---|---|
| **Color** | `color-primary: #0066CC`, `color-error: #CC0000` | Hex, HSL, RGB |
| **Spacing** | `spacing-sm: 8px`, `spacing-md: 16px` | px, rem |
| **Typography** | `font-size-body: 16px`, `font-family-heading: Inter` | px, rem, name |
| **Elevation** | `shadow-sm: 0 1px 2px rgba(0,0,0,0.1)` | CSS shadow |
| **Border** | `radius-md: 8px`, `border-width-thin: 1px` | px |
| **Motion** | `duration-fast: 150ms`, `easing-standard: ease-in-out` | ms, function |

**Tools**: Style Dictionary (Amazon), Tokens Studio (Figma plugin), Design Tokens W3C spec (draft).

### Component Library

Pre-built, tested, accessible components implementing design tokens.

**Qualities of a good component library**:
- **Accessible by default**: ARIA attributes, keyboard navigation, focus management built in
- **Composable**: compound component patterns, slots, render props
- **Themeable**: consumes tokens, supports multiple themes
- **Documented**: props table, usage examples, do/don't guidelines
- **Tested**: unit tests, integration tests, visual regression, a11y audit

**Examples**: Radix UI (headless), shadcn/ui (copy-paste), MUI, Ant Design, Chakra UI.

### Storybook as Living Documentation

```
Stories = Component × State Matrix

Button.stories.tsx:
  ├── Primary        (variant="primary")
  ├── Secondary      (variant="secondary")
  ├── Disabled       (disabled=true)
  ├── Loading        (isLoading=true)
  └── WithIcon       (icon={<Check />})
```

Each story serves triple duty:
1. **Documentation**: developers see rendered component + props API
2. **Visual regression baseline**: Chromatic/Percy captures screenshot per story
3. **Interaction test host**: `play()` functions test user interactions within stories

### Theming

Token-based theming enables multi-brand and dark mode support.

```
Theme Structure:
  ┌──────────────┐    ┌──────────────┐
  │  Light Theme  │    │  Dark Theme   │
  │  bg: #FFFFFF  │    │  bg: #1A1A2E  │
  │  text: #111   │    │  text: #E0E0E0│
  │  primary: #06C│    │  primary: #4DA│
  └───────┬───────┘    └───────┬───────┘
          │                     │
          └──────────┬──────────┘
                     │
              Component consumes
              semantic tokens only
              (color-bg, color-text)
```

**Pattern**: Components reference **semantic tokens** (not raw values). Theme swap changes token mapping,
all components update automatically.

### Connection to Accessibility

Design system enforces a11y **by construction**:
- Color tokens guarantee WCAG contrast ratios (4.5:1 AA, 3:1 large text)
- Focus ring tokens ensure visible keyboard focus indicators
- Component library ships ARIA roles, labels, live regions
- Storybook + axe integration catches regressions per story

---

## Component Design Principles

### Single Responsibility

One component, one job. If a component manages data fetching AND rendering AND form validation,
split it.

**Signal to split**: component has multiple reasons to change, or the name includes "And".

### Composition over Inheritance

React and modern frameworks favor **composition**: children, slots, render props.

| Pattern | Mechanism | When to Use |
|---|---|---|
| **Children** | `props.children` | Layout wrappers, generic containers |
| **Slots** | Named props accepting JSX | Multi-region layouts (header, body, footer) |
| **Render Props** | Function-as-child or function prop | Headless behavior (sharing logic, not UI) |
| **Hooks** | Custom hooks extracting logic | Stateful logic reuse without wrapping |

### Controlled vs Uncontrolled Components

| Aspect | Controlled | Uncontrolled |
|---|---|---|
| **State owner** | Parent component | Component itself (DOM/internal) |
| **Data flow** | `value` + `onChange` props | `ref` to read value, `defaultValue` for initial |
| **When to use** | Form validation, derived state, sync across components | Simple forms, third-party integration, performance |
| **Tradeoff** | More boilerplate, full control | Less code, less control |

**Hybrid pattern**: Support both — accept `value`/`onChange` (controlled) and fall back to internal state
when not provided (uncontrolled).

### Presentational vs Container Components

Original pattern (Dan Abramov, 2015) — now largely replaced by hooks:

| Aspect | Presentational | Container (or Custom Hook) |
|---|---|---|
| **Concern** | How things look | How things work |
| **Data** | Receives via props | Fetches, computes, manages state |
| **Side effects** | None | API calls, subscriptions, routing |
| **Modern equivalent** | Component (JSX) | Custom hook (`useProductList`) |

**Hooks-based separation**: Extract side effects and state into custom hooks. Component file imports the
hook and renders JSX. Same separation, no wrapper nesting.

### Compound Components Pattern

A set of components that work together, sharing implicit state.

```tsx
// Usage — the API reads like a sentence
<Select value={val} onChange={setVal}>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Content>
    <Select.Item value="a">Option A</Select.Item>
    <Select.Item value="b">Option B</Select.Item>
  </Select.Content>
</Select>
```

**Implementation**: Parent provides context; children consume it. Each child is useless alone but
powerful in composition. Examples: `<Tabs>`, `<Accordion>`, `<Menu>`, `<Form>`.

### Render Props and Higher-Order Components (Legacy)

| Pattern | Mechanism | Status |
|---|---|---|
| **Render Props** | Component calls a function prop to determine what to render | Still useful for headless UI libraries |
| **HOC** | Function wrapping a component, injecting props (`withAuth(Page)`) | Legacy — prefer hooks. Understand for existing codebases |

**Why hooks replaced HOCs**: HOCs cause wrapper hell, prop collision, and indirection. Hooks achieve
the same logic reuse with explicit, composable function calls.

---

## Monorepo Structure for Components

### Package Organization

```
packages/
├── ui-kit/            # Shared design system (atoms + molecules)
│   ├── src/components/
│   ├── src/tokens/
│   └── package.json
├── utils/             # Shared utilities
├── types/             # Shared TypeScript types
├── feature-checkout/  # Checkout BC UI module
│   ├── src/components/
│   ├── src/hooks/
│   └── package.json
├── feature-catalog/   # Catalog BC UI module
└── app-storefront/    # Deployable application
    └── package.json   # Depends on ui-kit + features
```

### Tools

| Tool | Strength | Key Feature |
|---|---|---|
| **Nx** | Task orchestration, dependency graph | Computation caching, affected commands |
| **Turborepo** | Build system speed | Remote caching, pipeline definition |
| **pnpm workspaces** | Package management | Strict dependency resolution, disk-efficient |
| **Changesets** | Versioning and changelogs | Per-package semantic versioning |

### Connection to DDD

**Package per Bounded Context UI module**:
- `packages/feature-checkout/` → Checkout BC
- `packages/feature-catalog/` → Catalog BC
- `packages/ui-kit/` → Shared Kernel (cross-BC design system)
- Import rules enforced by Nx boundaries or ESLint `no-restricted-imports`

---

## Cross-Cutting Connections

### Atomic Design + DDD Bounded Contexts

| Atomic Level | Scope | DDD Mapping |
|---|---|---|
| Atoms, Molecules | Cross-BC (design system) | Shared Kernel |
| Organisms | BC-specific | Bounded Context UI |
| Templates | BC-specific page layouts | BC-specific application layer |
| Pages | Route entry points | Anti-Corruption Layer (integrates BCs) |

### Clean Architecture Mapping

UI components live in the **Frameworks & Drivers** layer (outermost circle). Component architecture
respects the dependency rule:

```
Clean Architecture Ring    Frontend Equivalent
─────────────────────────────────────────────────
Entities                   Domain types, validation rules (shared/model)
Use Cases                  Feature hooks, state management (features/)
Interface Adapters         Container components, API mappers
Frameworks & Drivers       React components, CSS, UI library
```

### Testing Strategy by Component Level

| Component Level | Test Type | Tools | Confidence Target |
|---|---|---|---|
| **Atoms** | Unit tests, visual snapshot | Vitest, Storybook | Render correctly with all prop variants |
| **Molecules** | Integration tests | Testing Library | Atoms interact correctly |
| **Organisms** | Integration + interaction tests | Testing Library, MSW | State management, API integration |
| **Templates** | Structural tests | Testing Library | Layout composition, slot filling |
| **Pages** | E2E tests, BDD scenarios | Playwright | Full user journeys |

### Visual Regression Testing

**Storybook stories = visual test cases**. Each story captures a component state. Chromatic/Percy
screenshots every story on each PR. Drift from baseline = visual regression caught before merge.

### BDD Connection

Page-level **Gherkin scenarios** drive the structure of organisms and templates:

```gherkin
Given a user is on the checkout page          → CheckoutPage (page)
When they fill in the shipping form            → ShippingForm (organism)
And select a payment method                    → PaymentMethodSelector (organism)
Then they see an order summary                 → OrderSummary (widget)
And can place the order                        → PlaceOrderButton (feature)
```

BDD scenarios define **what** the page does; component architecture defines **how** it is composed.
Scenarios at the page level test organism/template integration. Individual organisms get their own
integration tests.
