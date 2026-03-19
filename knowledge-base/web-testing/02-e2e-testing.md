# E2E Testing for Web Applications: Complete Reference

## 1. Core Philosophy

E2E tests verify that **critical user journeys work through the real, integrated system**. They exercise the full stack: browser, frontend, backend, database, and external services.

### What E2E Tests Are For

- Validating that the system delivers value from the user's perspective
- Catching integration failures that unit and component tests cannot
- Providing confidence for deployment (the final gate in the test pyramid)

### What E2E Tests Are NOT For

- Covering every scenario (that is unit/integration testing's job)
- Testing business logic in isolation (use unit tests)
- Replacing contract tests for service boundaries
- Achieving high code coverage metrics

### The Testing Pyramid Placement

```
        /  E2E  \        ← Few, slow, high-confidence
       / Integration \    ← Moderate count, service boundaries
      /    Unit Tests   \ ← Many, fast, isolated
```

**Rule of thumb**: if a scenario can be verified at a lower level, do it there. E2E tests are expensive (slow, flaky, hard to debug). Reserve them for flows where integration across layers is the thing being validated.

---

## 2. Critical User Journeys (CUJs)

A CUJ is a sequence of user actions that delivers core business value. Not every user flow is a CUJ.

### Identification Criteria

| Factor | Question |
|---|---|
| **Revenue impact** | Does this flow directly generate or protect revenue? |
| **User frequency** | Do most users execute this flow in every session? |
| **Business criticality** | Would failure here cause regulatory, legal, or reputational damage? |
| **Complexity** | Does this flow cross multiple services or bounded contexts? |
| **Failure blast radius** | How many users are affected if this breaks? |

### Prioritization Framework

1. **P0 — Must always work**: Login/auth, checkout/payment, core data creation (e.g., "create order")
2. **P1 — High value**: Search, navigation, profile management, notifications
3. **P2 — Important but recoverable**: Settings, preferences, secondary workflows
4. **P3 — Nice to have**: Admin flows, edge-case paths

### CUJ Examples (E-Commerce)

- Sign up → browse catalog → add to cart → checkout → receive confirmation
- Login → view order history → initiate return
- Search → filter → compare → add to wishlist

**Guideline**: aim for 5-15 CUJs per bounded context. If you have 100+ E2E tests, you are testing too much at the E2E level.

---

## 3. Playwright (Primary Tool)

### Architecture

```
Test Runner (Node.js)
  ├── Browser Context 1  ← isolated session (cookies, storage, permissions)
  │     ├── Page 1       ← a single tab
  │     └── Page 2       ← another tab (multi-tab support)
  ├── Browser Context 2  ← separate isolated session
  │     └── Page 1
  └── ...
```

**Key architectural difference**: Playwright runs **out-of-process** via the Chrome DevTools Protocol (CDP), Firefox remote protocol, or WebKit inspector protocol. The test code and the browser are in separate processes, enabling:
- Multi-tab and multi-window testing
- Multi-browser testing from a single API
- Network-level interception
- Parallel execution without browser interference

### Auto-Wait Mechanism

Playwright **automatically waits** for elements to be actionable before performing actions. No explicit waits needed.

| Action | Waits For |
|---|---|
| `click()` | Element is visible, stable, enabled, receives events |
| `fill()` | Element is visible, enabled, editable |
| `check()` | Element is visible, stable, enabled |
| `selectOption()` | Element is visible, enabled |
| Navigation | Load event fires |

**Anti-pattern**: `await page.waitForTimeout(3000)` — never hard-code waits. Use assertions or auto-wait instead.

**Correct pattern**: `await expect(page.getByRole('button')).toBeEnabled()` — Playwright retries the assertion until timeout.

### Locator Strategies (Priority Order)

| Priority | Strategy | Example | When to Use |
|---|---|---|---|
| 1 | **Role** | `page.getByRole('button', { name: 'Submit' })` | Default choice; mirrors accessibility tree |
| 2 | **Label** | `page.getByLabel('Email address')` | Form fields with visible labels |
| 3 | **Text** | `page.getByText('Welcome back')` | Static visible text content |
| 4 | **Placeholder** | `page.getByPlaceholder('Search...')` | Inputs with placeholder text |
| 5 | **Alt text** | `page.getByAltText('Company logo')` | Images |
| 6 | **Title** | `page.getByTitle('Close dialog')` | Elements with title attribute |
| 7 | **Test ID** | `page.getByTestId('checkout-btn')` | **Last resort** — when no semantic locator works |

**Principle**: prefer locators that reflect how users and assistive technologies perceive the page. Role-based locators make tests resilient to DOM restructuring and enforce accessibility.

### Trace Viewer

```bash
# Enable trace collection
npx playwright test --trace on

# Open trace viewer after test run
npx playwright show-trace trace.zip
```

Trace viewer provides:
- **Timeline** of actions with screenshots at each step
- **DOM snapshot** at each action (inspectable)
- **Network log** (requests, responses, timing)
- **Console log** from the browser
- **Source code** mapping to each action

Best practice: record traces **on first retry** (`trace: 'on-first-retry'` in config) to capture failure context without the overhead of always-on tracing.

### Codegen

```bash
# Launch browser, record actions, generate test code
npx playwright codegen https://example.com
```

Use codegen to **bootstrap** tests, then refactor:
1. Generate the raw test with codegen
2. Extract page objects
3. Replace fragile selectors with role-based locators
4. Add meaningful assertions

### Multi-Browser Testing

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
```

Playwright uses **real browser engines** (Chromium, Firefox, WebKit), not browser emulators. Each browser is downloaded and managed by Playwright.

### API Testing

Playwright can make direct API calls without a browser, useful for test setup/teardown:

```typescript
// Direct API request (no browser needed)
const response = await request.newContext();
await response.post('/api/users', { data: { name: 'Alice' } });

// API request within browser context (shares cookies/auth)
const api = page.request;
await api.post('/api/seed', { data: testData });
```

### Network Interception

```typescript
// Mock an API response
await page.route('**/api/products', route =>
  route.fulfill({ json: [{ id: 1, name: 'Widget' }] })
);

// Modify a request
await page.route('**/api/checkout', route =>
  route.continue({ headers: { ...route.request().headers(), 'x-test': 'true' } })
);

// Abort requests (e.g., block analytics)
await page.route('**/analytics/**', route => route.abort());

// Wait for a specific API call
const responsePromise = page.waitForResponse('**/api/order');
await page.getByRole('button', { name: 'Place Order' }).click();
const response = await responsePromise;
```

---

## 4. Cypress (Alternative)

### Architecture Comparison

| Aspect | Playwright | Cypress |
|---|---|---|
| **Execution model** | Out-of-process (CDP/remote protocol) | In-browser (runs inside the app's browser context) |
| **Multi-tab** | Yes | No (single tab only) |
| **Multi-domain** | Yes (native) | Limited (via `cy.origin()` since v12) |
| **Browsers** | Chromium, Firefox, WebKit | Chromium, Firefox, Electron (no WebKit) |
| **Language** | JS/TS, Python, Java, .NET | JS/TS only |
| **Parallelism** | Built-in sharding, free | Cypress Cloud (paid) or third-party |
| **Network layer** | Full control (request/response modification) | Intercept via `cy.intercept()` |
| **iframes** | Native support | Requires workarounds |
| **Speed** | Fast (parallel, lightweight contexts) | Fast (in-process, direct DOM access) |

### Cypress Strengths

- **Developer experience**: interactive test runner with real-time reloading
- **Time-travel debugging**: snapshots at every command, click to inspect DOM state
- **Automatic waiting**: built-in retry-ability on commands and assertions
- **Excellent documentation**: clear guides, real-world examples
- **Component testing**: native support for testing components in isolation

### Cypress Limitations

- Single tab per test (cannot test flows involving popups, new windows, OAuth redirects in separate tabs)
- Historically single-origin; `cy.origin()` added multi-origin support but with constraints
- No WebKit/Safari testing
- JavaScript/TypeScript only
- Paid parallelization (Cypress Cloud) for CI

### When to Choose

| Choose Playwright When | Choose Cypress When |
|---|---|
| Multi-browser coverage including Safari/WebKit | Team is JS-only and values DX above all |
| Multi-tab or multi-window flows | Component testing is a primary need |
| Cross-language teams (Python, Java, .NET) | Time-travel debugging is a dealbreaker |
| Free parallelization in CI is required | Existing Cypress investment and no pain points |
| iframes, file downloads, native dialogs | Simpler app without multi-tab/multi-origin needs |

---

## 5. Test Patterns

### Page Object Model (POM)

Encapsulates page structure and interactions behind a clean API. Tests read as user intent, not DOM traversal.

```typescript
// page-objects/checkout-page.ts
export class CheckoutPage {
  constructor(private page: Page) {}

  async fillShippingAddress(address: Address) {
    await this.page.getByLabel('Street').fill(address.street);
    await this.page.getByLabel('City').fill(address.city);
    await this.page.getByLabel('Zip').fill(address.zip);
  }

  async placeOrder() {
    await this.page.getByRole('button', { name: 'Place Order' }).click();
  }

  async expectConfirmation(orderId: string) {
    await expect(this.page.getByText(`Order ${orderId} confirmed`)).toBeVisible();
  }
}

// test
test('complete checkout', async ({ page }) => {
  const checkout = new CheckoutPage(page);
  await checkout.fillShippingAddress(testAddress);
  await checkout.placeOrder();
  await checkout.expectConfirmation('ORD-001');
});
```

**Rules**:
- Page objects expose **domain-meaningful methods**, not `click`/`fill` wrappers
- Assertions can live in page objects (e.g., `expectConfirmation`) or in tests
- Never expose locators directly; all interaction goes through methods

### App Actions Pattern

Bypass the UI for test setup. Use API calls or direct database operations to reach the desired state, then test only the flow under verification.

```typescript
// Instead of clicking through login UI for every test:
test('dashboard shows recent orders', async ({ page, request }) => {
  // Setup via API (fast, reliable)
  await request.post('/api/test/seed', { data: { user: testUser, orders: testOrders } });

  // Inject auth state (skip login UI)
  await page.goto('/dashboard');

  // Test only the dashboard behavior
  await expect(page.getByText('Recent Orders')).toBeVisible();
});
```

**Guideline**: test the login flow in one dedicated E2E test. All other tests reuse stored auth state.

### Test Isolation

Each test must be independent. No test should depend on another test's side effects.

| Technique | Implementation |
|---|---|
| **Fresh browser context** | Playwright creates a new context per test by default |
| **API seeding** | Seed test data via API before each test |
| **Database reset** | Truncate/reseed between tests (if accessible) |
| **Unique data** | Use unique identifiers per test run (e.g., `user-${testId}@test.com`) |

**Anti-pattern**: ordered test suites where test B depends on state created by test A.

### Test Data Management

| Strategy | Pros | Cons | Best For |
|---|---|---|---|
| **Fixtures (static JSON)** | Simple, versioned | Stale, manual maintenance | Stable reference data |
| **API seeding** | Realistic, fast | Requires test API endpoints | Most E2E scenarios |
| **Database seeding** | Full control, fast | Tight coupling to schema | When API seeding is unavailable |
| **Factory functions** | Dynamic, composable | Requires maintenance | Complex data relationships |
| **Snapshot/restore** | Fast reset, realistic | Infrastructure overhead | Large datasets |

### Authentication Handling (Storage State Reuse)

```typescript
// global-setup.ts — run once, save auth state
async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: './auth-state.json' });
  await browser.close();
}

// playwright.config.ts — reuse for all tests
export default defineConfig({
  use: { storageState: './auth-state.json' },
});
```

This authenticates **once** and reuses the session across all tests, saving significant time.

---

## 6. Flaky Test Management

### Common Causes

| Cause | Symptom | Fix |
|---|---|---|
| **Timing/race conditions** | Passes locally, fails in CI | Use auto-wait; assert on visible state, not timing |
| **Shared mutable state** | Fails when run in parallel | Isolate test data; unique identifiers per test |
| **External dependencies** | Intermittent network failures | Mock external services; use network interception |
| **Animations/transitions** | Click hits wrong element | Disable animations in test mode; wait for stability |
| **Non-deterministic data** | Assertion fails on dynamic values | Use patterns/regex in assertions; seed known data |
| **Resource contention** | Timeouts in CI | Increase CI resources; reduce parallelism |
| **Test order dependency** | Fails in isolation | Make each test self-contained |

### Retry Policies

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,  // Retry in CI, not locally
  use: {
    trace: 'on-first-retry',         // Capture trace on retry for debugging
  },
});
```

**Retries mask problems**. Use them as a safety net, not a solution. Every retried test should generate an investigation ticket.

### Quarantine Strategy

1. **Detect**: monitor test stability metrics (pass rate over last N runs)
2. **Quarantine**: move consistently flaky tests to a separate, non-blocking suite
3. **Investigate**: assign ownership; analyze traces, logs, screenshots
4. **Fix or remove**: fix the root cause and return to the main suite, or delete the test if it provides no value
5. **Track**: maintain a flaky test dashboard with age and ownership

**Rule**: quarantined tests that are not fixed within 2 weeks should be reviewed for deletion.

### Root Cause Analysis

1. Reproduce locally with `--repeat-each=10`
2. Enable trace recording (`--trace on`)
3. Check CI environment differences (container resources, network, display server)
4. Inspect the trace timeline for unexpected delays or missing elements
5. Look for shared state: database records, browser storage, global variables

---

## 7. BDD + E2E Integration

### Gherkin to Playwright Pipeline

```
Feature file (Gherkin)
  → Step definitions (glue code)
    → Page objects
      → Playwright actions
```

### cucumber-js + Playwright

```gherkin
# features/checkout.feature
Feature: Checkout
  Scenario: Successful purchase
    Given I am logged in as a premium customer
    And I have "Widget X" in my cart
    When I proceed to checkout
    And I enter valid shipping details
    And I place the order
    Then I should see an order confirmation
    And I should receive a confirmation email
```

```typescript
// steps/checkout.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { CheckoutPage } from '../page-objects/checkout-page';

Given('I am logged in as a premium customer', async function () {
  // Use stored auth state — App Actions pattern
  await this.page.context().addCookies(premiumUserCookies);
});

When('I place the order', async function () {
  const checkout = new CheckoutPage(this.page);
  await checkout.placeOrder();
});

Then('I should see an order confirmation', async function () {
  const checkout = new CheckoutPage(this.page);
  await checkout.expectConfirmation();
});
```

### Not All BDD Scenarios Should Be E2E

| Scenario Type | Test Level | Reason |
|---|---|---|
| Core user journey (happy path) | **E2E** | Validates full integration |
| Business rule with multiple examples | **Unit/Integration** | Fast feedback, combinatorial coverage |
| Edge cases and error handling | **Unit/Integration** | Too many to run as E2E |
| UI-specific behavior (layout, animation) | **Component test** | No backend needed |
| API contract validation | **Contract test** | Faster, more targeted |

**Guideline**: write many Gherkin scenarios for discovery and documentation. Automate most at unit/integration level. Promote only CUJs to E2E.

---

## 8. CI/CD Integration

### Headless Mode

```bash
# Playwright runs headless by default
npx playwright test

# Explicit headless (useful in scripts)
npx playwright test --headed  # for debugging only
```

CI environments typically have no display server. Playwright's headless mode requires no `xvfb` setup (unlike Selenium).

### Parallelization and Sharding

```bash
# Run tests across 4 shards (CI matrix strategy)
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
```

```yaml
# GitHub Actions example
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=${{ matrix.shard }}
```

Within each shard, Playwright also runs test files in parallel workers (configurable via `workers` in config).

### Artifact Collection

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  outputDir: './test-results',
});
```

```yaml
# CI artifact upload (GitHub Actions)
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report-${{ matrix.shard }}
    path: |
      playwright-report/
      test-results/
```

### Pipeline Stage Placement

```
┌──────────┐   ┌────────────┐   ┌───────────────┐   ┌──────────┐   ┌──────────┐
│  Build   │ → │ Unit Tests │ → │  Integration  │ → │   E2E    │ → │  Deploy  │
│          │   │  (fast)    │   │  + Contract   │   │  (CUJs)  │   │          │
└──────────┘   └────────────┘   └───────────────┘   └──────────┘   └──────────┘
                                                          ↑
                                                    Gate: all prior
                                                    stages must pass
```

- Run E2E tests against a **deployed preview/staging environment**, not during build
- E2E suite should complete in **under 10 minutes** (with parallelization)
- If E2E suite exceeds 10 minutes, re-evaluate: too many tests, or insufficient sharding

---

## 9. Connection to DDD / Clean Architecture

### E2E Tests Verify the Full Stack

```
E2E test exercises:
  Browser (Frameworks & Drivers layer)
    → Controllers / Presenters (Interface Adapters layer)
      → Use Cases (Application layer)
        → Entities / Domain Services (Domain layer)
          → Database / External Services (Infrastructure layer)
```

E2E tests are the only tests that validate all Clean Architecture layers working together. They confirm that the Dependency Rule has not been violated in a way that breaks runtime behavior.

### Use Ubiquitous Language in Tests

Tests should read like domain conversations, not technical procedures.

| Bad (technical) | Good (ubiquitous language) |
|---|---|
| `clickButton('#submit-btn')` | `checkout.placeOrder()` |
| `fillInput('.email-field', 'x@y.com')` | `registration.enterEmailAddress('x@y.com')` |
| `assertElementVisible('.confirmation')` | `orderConfirmation.expectOrderPlaced()` |
| `navigateTo('/products?cat=3')` | `catalog.browseCategory('Electronics')` |

Page objects and step definitions should use the same language that domain experts use. If a developer cannot read an E2E test aloud to a product owner, the test needs refactoring.

### One E2E Suite per Bounded Context UI

| Bounded Context | E2E Suite | CUJs |
|---|---|---|
| **Ordering** | `e2e/ordering/` | Place order, cancel order, track order |
| **Catalog** | `e2e/catalog/` | Search products, filter, view details |
| **Identity** | `e2e/identity/` | Sign up, login, password reset |
| **Payments** | `e2e/payments/` | Add payment method, process payment, refund |

- Each bounded context owns its E2E tests alongside its code
- Cross-context CUJs (e.g., "browse → checkout → pay") test integration at the **system level** and live in a separate `e2e/system/` suite
- Avoid coupling E2E tests across bounded contexts; mock or stub at context boundaries where possible

---

## Quick Reference: Playwright Config Template

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? '50%' : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /.*\.teardown\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: './auth-state.json' },
      dependencies: ['setup'],
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], storageState: './auth-state.json' }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: './auth-state.json' }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```
