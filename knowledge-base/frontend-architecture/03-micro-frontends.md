# Micro-Frontends: Complete Reference

## 1. Core Concept

**Extend microservice principles to the frontend.** Each team owns a vertical slice from UI to
database. Each micro-frontend is independently developed, tested, deployed, and can make its own
technology choices.

```
┌─────────────────────────────────────────────────────┐
│                  Shell Application                   │
│  (routing, auth, layout, orchestration)              │
├──────────┬──────────┬──────────┬───────────────────┤
│  MFE: A  │  MFE: B  │  MFE: C  │  MFE: D          │
│  Team A  │  Team B  │  Team C  │  Team D           │
│  React   │  Vue     │  Angular │  React            │
│  ┌────┐  │  ┌────┐  │  ┌────┐  │  ┌────┐          │
│  │ UI │  │  │ UI │  │  │ UI │  │  │ UI │          │
│  ├────┤  │  ├────┤  │  ├────┤  │  ├────┤          │
│  │BFF │  │  │BFF │  │  │BFF │  │  │BFF │          │
│  ├────┤  │  ├────┤  │  ├────┤  │  ├────┤          │
│  │ DB │  │  │ DB │  │  │ DB │  │  │ DB │          │
│  └────┘  │  └────┘  │  └────┘  │  └────┘          │
└──────────┴──────────┴──────────┴───────────────────┘
```

**Key properties:**
- **Independent deployability** — deploy one MFE without redeploying others
- **Team autonomy** — each team chooses stack, release cadence, internal architecture
- **Fault isolation** — one MFE crashing does not take down the whole page
- **Incremental upgrades** — migrate framework version one MFE at a time

---

## 2. When to Use

### Good Fit

- Multiple teams (3+) working on the same web application
- Different bounded contexts need different UI modules (e.g., catalog, checkout, admin)
- Independent deployment of frontend features is a hard requirement
- Legacy migration: strangle the monolith by replacing sections with micro-frontends
- Different parts of the UI have different performance / technology requirements

### Poor Fit

- Small team (1-2 developers) — overhead exceeds benefit
- Single bounded context — no natural decomposition boundary
- Simple application (marketing site, CRUD admin) — unnecessary complexity
- Team lacks DevOps maturity — each MFE needs its own CI/CD pipeline
- Performance-critical SPA where bundle splitting already suffices

**Litmus test:** If you would not split the backend into microservices for this context, do not split
the frontend either.

---

## 3. Composition Approaches

### 3.1 Build-Time Composition

Micro-frontends published as **npm packages**. Shell imports and bundles them at build time.

```
# package.json of shell
"dependencies": {
  "@org/mfe-catalog": "^2.1.0",
  "@org/mfe-checkout": "^1.4.0"
}
```

**Pros:** Simplest to implement. Single deployment artifact. Tree-shaking works.
**Cons:** **Least independent.** Version bump in one MFE requires shell rebuild and redeploy.
Defeats the core purpose of micro-frontends. Essentially a monorepo with shared components.

Use only when: teams want shared component libraries, not true micro-frontends.

### 3.2 Server-Side Composition

Server assembles the page from fragments before sending HTML to the browser.

| Technique | How It Works | Latency | Complexity |
|---|---|---|---|
| **SSI (Server-Side Includes)** | Nginx/Apache directive `<!--#include virtual="/mfe-a" -->` | Low (cached fragments) | Low |
| **ESI (Edge-Side Includes)** | CDN-level composition `<esi:include src="/mfe-b"/>` (Varnish, Akamai) | Very low | Medium |
| **Tailor (Zalando)** | Node.js service stitches fragments from URLs, streams HTML | Low (streaming) | Medium |
| **Podium (Finn.no)** | Layout service + podlet servers, HTTP-based fragment protocol | Low | Medium |

**Pros:** Fast first-paint (HTML arrives composed). SEO-friendly. Works without JavaScript.
**Cons:** Server infrastructure per MFE. Harder client-side interactivity between fragments.

### 3.3 Client-Side Composition

Browser assembles micro-frontends at runtime.

#### Module Federation (Webpack 5 / Rspack)

Runtime module sharing. Host loads remote bundles on demand. See Section 4 for deep dive.

#### single-spa

Framework-agnostic orchestrator. Registers micro-frontends as "applications" with lifecycle hooks
(`bootstrap`, `mount`, `unmount`). Shell activates apps based on route.

```javascript
// Shell: register micro-frontends
registerApplication({
  name: '@org/catalog',
  app: () => System.import('@org/catalog'),
  activeWhen: ['/catalog'],
});
registerApplication({
  name: '@org/checkout',
  app: () => System.import('@org/checkout'),
  activeWhen: ['/checkout'],
});
start();
```

**Pros:** Framework-agnostic (React + Angular + Vue on same page). Mature ecosystem.
**Cons:** Complexity of SystemJS / import maps. Each app must implement lifecycle hooks.

#### Web Components

Native browser encapsulation via Custom Elements + Shadow DOM.

```javascript
// MFE wraps itself as a custom element
class CatalogApp extends HTMLElement {
  connectedCallback() { /* mount React/Vue/etc here */ }
  disconnectedCallback() { /* cleanup */ }
}
customElements.define('mfe-catalog', CatalogApp);
```

**Pros:** Browser-native. No framework dependency. Style isolation via Shadow DOM.
**Cons:** Shadow DOM CSS limitations. Framework integration requires wrappers. Event bubbling across
Shadow DOM boundaries needs care.

#### iframes

Strongest isolation. Each MFE in its own browsing context.

**Pros:** Complete JS/CSS isolation. Security boundary. Crash isolation.
**Cons:** No shared state. URL sync is painful. Accessibility issues. Performance overhead.
Responsive design complications. **Use sparingly** — for embedding untrusted third-party content or
legacy apps only.

### 3.4 Comparison Table

| Approach | Independence | Performance | Complexity | Browser Support |
|---|---|---|---|---|
| **Build-time (npm)** | Low | Best (single bundle) | Low | All |
| **Server-side (SSI/ESI)** | High | Good (streaming HTML) | Medium | All (server-rendered) |
| **Module Federation** | High | Good (lazy loading) | Medium-High | Modern (Webpack 5+) |
| **single-spa** | High | Good (lazy loading) | High | Modern |
| **Web Components** | High | Good | Medium | Modern (polyfills available) |
| **iframes** | Highest | Worst (multiple contexts) | Low | All |

---

## 4. Module Federation (Webpack 5)

### Core Model

**Host** (shell) declares which remotes it can load. **Remote** (micro-frontend) exposes modules.
At runtime, the host fetches the remote's entry file and loads shared modules on demand.

```
Host (Shell)                          Remote (Catalog MFE)
┌─────────────┐                      ┌──────────────────┐
│ Consumes:    │───── HTTP GET ─────→│ Exposes:          │
│ catalog/App  │  remoteEntry.js      │ ./App             │
│              │←─── JS module ──────│ ./ProductList     │
│ Shared:      │                      │ Shared:           │
│ react: ^18   │◄──── negotiated ───►│ react: ^18        │
│ react-dom    │   (singleton)        │ react-dom         │
└─────────────┘                      └──────────────────┘
```

### Host Configuration

```javascript
// webpack.config.js — Shell
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        catalog: 'catalog@https://catalog.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        '@org/design-system': { singleton: true },
      },
    }),
  ],
};
```

### Remote Configuration

```javascript
// webpack.config.js — Catalog MFE
new ModuleFederationPlugin({
  name: 'catalog',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/App',
    './ProductList': './src/components/ProductList',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    '@org/design-system': { singleton: true },
  },
});
```

### Dynamic Remotes

Load micro-frontends by URL at runtime (no rebuild of shell needed).

```javascript
// Load remote entry dynamically
async function loadRemote(scope, module, url) {
  await __webpack_init_sharing__('default');
  const container = await loadScript(url); // injects remoteEntry.js
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(module);
  return factory();
}

// Usage: load from config service
const catalogUrl = await fetch('/api/mfe-registry').then(r => r.json());
const CatalogApp = await loadRemote('catalog', './App', catalogUrl.catalog);
```

**MFE Registry pattern:** Store remote URLs in a configuration service. Shell fetches registry at
startup. Enables A/B testing, canary deployments, feature flags per MFE version.

### Version Mismatch Handling

| Strategy | Behavior | Config |
|---|---|---|
| **Singleton** | Only one version loaded; warns on mismatch | `singleton: true` |
| **Strict version** | Fails if version doesn't satisfy range | `strictVersion: true` |
| **Fallback** | Each MFE loads its own copy if mismatch | `singleton: false` (default) |
| **Eager** | Include shared module in initial chunk | `eager: true` |

**Rule of thumb:** Mark framework dependencies (React, Angular) as `singleton: true`. Mark utility
libraries as non-singleton (each MFE can use its own version safely).

---

## 5. Shell Application

### Responsibilities

```
┌─────────────────────────────────────────┐
│              Shell (thin)                │
│                                         │
│  ┌─────────┐  ┌────────┐  ┌─────────┐  │
│  │ Routing  │  │  Auth  │  │ Layout  │  │
│  └─────────┘  └────────┘  └─────────┘  │
│  ┌──────────────┐  ┌────────────────┐   │
│  │ MFE Loader   │  │ Error Boundary │   │
│  └──────────────┘  └────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ Shared State (auth token only)   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

| Responsibility | Shell Owns | MFE Owns |
|---|---|---|
| **Top-level routing** | `/catalog/*`, `/checkout/*` | Sub-routes within its path prefix |
| **Authentication** | Login flow, token management | Sending token with API calls |
| **Layout** | Header, footer, navigation, sidebar | Content area within its mount point |
| **Error handling** | Error boundary per MFE slot | Internal error handling |
| **Shared state** | Auth token, user profile (minimal) | All business state |

**The shell must be thin.** It is an orchestrator, not a business logic container. If you find
business logic in the shell, a bounded context boundary is wrong.

### Connection to API Gateway

The shell is the **frontend equivalent of an API Gateway**:

| API Gateway | Shell Application |
|---|---|
| Routes requests to microservices | Routes navigation to micro-frontends |
| Handles authentication | Handles authentication |
| Cross-cutting: rate limiting, logging | Cross-cutting: analytics, error tracking |
| No business logic | No business logic |

---

## 6. Shared Concerns

### 6.1 Design System

Shared component library ensures visual consistency across micro-frontends.

```
@org/design-system (npm package)
├── Button, Input, Modal, ...
├── Tokens (colors, spacing, typography)
└── Shared via Module Federation: singleton: true
```

**Rules:**
- Design system is framework-agnostic or matches the dominant framework
- Versioned and published independently
- MFEs depend on a version range, not a pinned version
- Visual regression tests run per MFE and integrated

### 6.2 Authentication

Shell handles the authentication lifecycle. Micro-frontends receive credentials.

```
1. User lands on app → Shell checks auth state
2. Not authenticated → Shell redirects to login (or shows login MFE)
3. Authenticated → Shell stores token (memory, not localStorage)
4. Shell passes token to MFEs via:
   - Props/attributes (Web Components)
   - Shared context (Module Federation shared module)
   - Custom event on mount
5. MFEs attach token to outbound API calls
6. Token refresh → Shell handles, MFEs get updated token
```

**Never** let each MFE manage its own auth flow. Single source of truth in the shell.

### 6.3 Routing

```
Shell routes (top-level):
  /catalog/*  → mount Catalog MFE
  /checkout/* → mount Checkout MFE
  /admin/*    → mount Admin MFE

MFE routes (internal):
  Catalog MFE:
    /catalog/         → ProductList
    /catalog/:id      → ProductDetail
    /catalog/search   → Search
```

**Routing contract:** Shell and MFE agree on the path prefix. MFE owns everything under that prefix.
Shell must not reach into MFE routes. MFE must not navigate outside its prefix without notifying
the shell (via event or shared router).

### 6.4 Communication Between Micro-Frontends

| Mechanism | Coupling | Use Case |
|---|---|---|
| **Custom Events** (`window.dispatchEvent`) | Low | One-way notifications (cart updated, user logged out) |
| **Shared Event Bus** | Low-Medium | Pub/sub between MFEs, typed events |
| **URL / Query Params** | Very Low | Cross-MFE navigation with context |
| **Props / Attributes** | Medium | Parent-to-child data passing |
| **Shared State (Redux, etc.)** | **High — avoid** | Creates hidden coupling, defeats independence |

**Golden rule:** Micro-frontends should communicate through **events, not shared state.** If two
MFEs need tight data sharing, they likely belong in the same bounded context.

```javascript
// Catalog MFE: dispatch event when product added to cart
window.dispatchEvent(new CustomEvent('cart:item-added', {
  detail: { productId: '123', quantity: 1 },
}));

// Cart MFE: listen for cart events
window.addEventListener('cart:item-added', (e) => {
  addToCart(e.detail.productId, e.detail.quantity);
});
```

### 6.5 Error Handling

Each micro-frontend is wrapped in an **error boundary** at the shell level.

```jsx
// Shell renders each MFE inside an error boundary
<ErrorBoundary fallback={<MFEUnavailable name="catalog" />}>
  <Suspense fallback={<Loading />}>
    <CatalogMFE />
  </Suspense>
</ErrorBoundary>
```

**Graceful degradation:** If one MFE fails to load or crashes:
- Show a placeholder with retry option
- Rest of the page continues to function
- Log error to centralized monitoring (Sentry, Datadog)
- Never let one MFE crash propagate to others

---

## 7. Testing Micro-Frontends

### Test Pyramid per MFE

Each micro-frontend has its own complete test suite, run independently.

| Level | Scope | Tools | Runs When |
|---|---|---|---|
| **Unit** | Components, hooks, utils within one MFE | Jest, Vitest, Testing Library | Every commit |
| **Integration** | MFE mounted in isolation, API mocked | Testing Library, MSW | Every commit |
| **Contract** | Shell ↔ MFE interface (props, events, routes) | Pact, custom schema validation | Every commit |
| **Visual Regression** | MFE rendered in isolation | Chromatic, Percy, Playwright screenshots | Every PR |
| **E2E (isolated)** | Single MFE user flows | Playwright, Cypress | Every PR |
| **E2E (integrated)** | Cross-MFE user journeys | Playwright against deployed shell + all MFEs | Pre-release |

### Contract Tests

The shell and each MFE agree on a **contract**: what props/attributes are passed, what events are
emitted, what route prefixes are expected.

```typescript
// Contract definition
interface CatalogMFEContract {
  // Shell provides to MFE
  props: {
    authToken: string;
    locale: string;
  };
  // MFE emits to shell
  events: {
    'catalog:product-selected': { productId: string };
    'catalog:navigation': { path: string };
  };
  // Route prefix
  routePrefix: '/catalog';
}
```

Contract tests verify both sides honor this interface. **Breaks are caught before deployment.**

> **See also:** [Contract Testing knowledge base](../contract-testing/01-contract-testing-complete.md)
> for Pact and provider verification patterns.

### E2E Integrated Tests

Cross-MFE journeys test the full user flow across micro-frontend boundaries:

```
Scenario: Complete purchase
  1. Browse catalog (Catalog MFE)
  2. Add item to cart (Catalog → Cart event)
  3. View cart (Cart MFE)
  4. Proceed to checkout (Cart → Checkout navigation)
  5. Complete payment (Checkout MFE)
```

Run against a staging environment with all MFEs deployed. Keep these tests minimal — they are slow
and brittle. Focus on critical paths only.

> **See also:** [Web Testing knowledge base](../web-testing/01-test-strategy-shapes.md) for test
> strategy shapes and E2E practices.

---

## 8. Deployment

### Independent Deployment Pipeline

Each micro-frontend has its **own CI/CD pipeline**. Deploying MFE-A does not require deploying
MFE-B or the shell.

```
MFE-A Repo                    MFE-B Repo
  │                              │
  ├─ lint + unit tests           ├─ lint + unit tests
  ├─ integration tests           ├─ integration tests
  ├─ contract tests              ├─ contract tests
  ├─ build                       ├─ build
  ├─ visual regression           ├─ visual regression
  ├─ deploy to staging           ├─ deploy to staging
  ├─ E2E (isolated)              ├─ E2E (isolated)
  └─ deploy to production        └─ deploy to production
       │                              │
       └──── Integrated E2E ──────────┘
              (post-deploy smoke tests)
```

### Version Management

- **Immutable artifacts:** Each build produces versioned assets (`catalog.v2.3.1.js`)
- **MFE Registry:** Maps MFE name → current production URL
- **Compatible versions:** Shell declares minimum contract version per MFE
- **Canary:** Route percentage of traffic to new MFE version via registry

### Rollback

Rollback = update registry to point to previous version's assets. No rebuild needed. Assets are
immutable on CDN.

```
Registry before: { catalog: "https://cdn.example.com/catalog/v2.3.1/remoteEntry.js" }
Rollback:        { catalog: "https://cdn.example.com/catalog/v2.3.0/remoteEntry.js" }
```

### AWS Deployment Topology

| Component | AWS Service | Notes |
|---|---|---|
| **MFE static assets** | S3 + CloudFront (per MFE) | Each MFE has its own S3 bucket/prefix and CloudFront distribution |
| **Shell** | S3 + CloudFront | Separate distribution, fetches remoteEntry.js from MFE CDNs |
| **MFE Registry** | DynamoDB + Lambda (or AppConfig) | Stores current version URLs |
| **SSR MFEs** | ECS Fargate or Lambda@Edge | For server-side rendered micro-frontends |
| **BFF per MFE** | API Gateway + Lambda (or ECS) | Each MFE's backend-for-frontend |

> **See also:** [Continuous Delivery knowledge base](../continuous-delivery/01-core-principles.md)
> for pipeline principles and deployment strategies.

---

## 9. Connection to DDD and Methodologies

### One Micro-Frontend per Bounded Context (Golden Rule)

The most important architectural decision: **micro-frontend boundaries align with bounded context
boundaries.** This is not optional — it is the organizing principle.

```
DDD Context Map                    Micro-Frontend Map
┌─────────────┐                   ┌─────────────┐
│  Catalog BC  │                   │ Catalog MFE  │
├─────────────┤                   ├─────────────┤
│ Ordering BC  │                   │ Ordering MFE │
├─────────────┤                   ├─────────────┤
│ Shipping BC  │                   │ Shipping MFE │
├─────────────┤                   ├─────────────┤
│  Billing BC  │                   │ Billing MFE  │
└─────────────┘                   └─────────────┘
```

If a UI feature spans two bounded contexts, it is a **composition** at the shell level, not a single
micro-frontend. Each MFE contributes its piece.

### Context Map Relationships → Integration Patterns

| DDD Relationship | MFE Integration Pattern |
|---|---|
| **Shared Kernel** | Shared npm package (design system, common types) |
| **Customer-Supplier** | Downstream MFE consumes upstream MFE's events |
| **Conformist** | MFE adapts to upstream's data format directly |
| **Anti-Corruption Layer** | Adapter module translates between MFE data models |
| **Published Language** | Shared event schema (JSON Schema, TypeScript interfaces) |
| **Separate Ways** | MFEs are completely independent, no integration |

### Anti-Corruption Layer in Frontend

When MFE-A must consume data or events from MFE-B, add an adapter layer to prevent domain model
leakage:

```typescript
// Catalog MFE: ACL adapter for Pricing MFE events
// Translates Pricing domain concepts into Catalog domain concepts

import type { PricingEvent } from './acl/pricing-adapter';

const pricingAdapter = {
  toCatalogPrice(pricingEvent: PricingEvent): CatalogPrice {
    return {
      amount: pricingEvent.grossAmount,    // Pricing says "grossAmount"
      currency: pricingEvent.currencyCode, // Catalog says "currency"
      discounted: pricingEvent.promotionApplied,
    };
  },
};
```

### Event Modeling Swimlanes → MFE Boundaries

In Event Modeling, each **swimlane** represents a bounded context's read/write responsibilities.
Each swimlane maps to a micro-frontend:

```
Swimlane: Catalog    │  Swimlane: Cart      │  Swimlane: Checkout
─────────────────────┼──────────────────────┼─────────────────────
  Browse Products     │  Add to Cart          │  Enter Shipping
  View Details        │  Update Quantity      │  Select Payment
  Search/Filter       │  View Cart            │  Place Order
         ↓            │         ↓             │         ↓
   Catalog MFE        │    Cart MFE           │   Checkout MFE
```

> **See also:** [Event Modeling knowledge base](../event-modeling/01-event-modeling-complete.md)

### Conway's Law

**Organizations produce designs that mirror their communication structures.** If you want
micro-frontends, organize teams around bounded contexts:

```
Team Catalog  → owns Catalog MFE  + Catalog microservice  + Catalog DB
Team Checkout → owns Checkout MFE + Checkout microservice  + Checkout DB
Team Platform → owns Shell        + Design System          + CI/CD platform
```

One team per bounded context. One micro-frontend per team. The team owns the full vertical slice.
This is the **Inverse Conway Maneuver** — structure teams to get the architecture you want.

### Clean Architecture per Micro-Frontend

Each micro-frontend applies Clean Architecture internally. The MFE boundary is the outermost layer.

```
┌─────────────────────────────────────────┐
│  MFE Framework Layer (React, Webpack)   │
│  ┌─────────────────────────────────┐    │
│  │  Interface Adapters              │    │
│  │  (Components, API clients)       │    │
│  │  ┌─────────────────────────┐     │    │
│  │  │  Use Cases               │     │    │
│  │  │  (Application logic)     │     │    │
│  │  │  ┌─────────────────┐     │     │    │
│  │  │  │  Domain          │     │     │    │
│  │  │  │  (Entities, VOs) │     │     │    │
│  │  │  └─────────────────┘     │     │    │
│  │  └─────────────────────────┘     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Each MFE's domain layer knows nothing about other MFEs.** Cross-MFE communication happens at the
outermost layer (framework/adapter), never at the domain or use-case level.

> **See also:** [Clean Architecture knowledge base](../clean-architecture/01-clean-architecture-complete.md)
> and [DDD Strategic Design](../ddd/04-strategic-design.md)
