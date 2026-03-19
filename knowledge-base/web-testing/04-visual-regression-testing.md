# Visual Regression Testing -- Complete Reference

## 1. Core Concept

**Functional tests pass != UI looks correct.** A component can return the right data, handle events properly, and pass every unit/integration test -- yet render with a broken layout, wrong font, misaligned elements, or invisible text on a white background.

Visual regression testing catches **unintended visual changes** by comparing screenshots (or DOM snapshots) of the UI against approved baselines.

### What It Catches

| Category | Examples |
|---|---|
| **Layout shifts** | Element pushed off-screen, grid column collapse, flex wrapping |
| **Typography regressions** | Wrong font loaded, line-height change, text overflow/truncation |
| **Color regressions** | Theme variable override, contrast loss, hover state color wrong |
| **Z-index issues** | Modal behind overlay, dropdown clipped by parent, tooltip hidden |
| **Responsive breakage** | Mobile layout broken at 375px, tablet sidebar overlap |
| **CSS cascade side effects** | Global style change bleeds into unrelated component |
| **Animation/transition bugs** | Spinner stuck, fade-in never completes, jank on scroll |

### Why Functional Tests Miss These

- Unit tests assert behavior (click handler fires), not appearance (button is visible and styled)
- Integration tests verify data flow, not pixel rendering
- CSS has no type system -- a typo in a property name silently fails
- Browser rendering is the only source of truth for visual correctness

---

## 2. Approaches

### Screenshot Comparison (Pixel Diff)

Captures rendered screenshots, compares baseline vs current pixel-by-pixel.

- **Pros**: catches everything visible to the user, no false negatives for visual changes
- **Cons**: brittle to anti-aliasing, font rendering differences across OS/browser, sub-pixel shifts
- **Mitigation**: configurable thresholds, perceptual diff algorithms, running in consistent environments (Docker, CI)

### DOM Snapshot Comparison

Serializes the DOM tree (HTML + computed styles) and compares structurally.

- **Pros**: faster, less brittle, no rendering needed
- **Cons**: misses visual-only issues (overlapping elements, z-index, actual rendered appearance)
- **Use case**: supplement to screenshot testing, not a replacement

### Component-Level Visual Testing

Tests isolated components (typically via Storybook stories) in a controlled environment.

- **Pros**: fast, deterministic, tests every state in isolation, catches regressions at the smallest unit
- **Cons**: misses integration-level visual issues (component interactions, page layout)
- **Best for**: design system components, shared UI libraries

### Full-Page Visual Testing

Captures complete pages via E2E tools (Playwright, Cypress).

- **Pros**: catches layout issues from component composition, real routing/data context
- **Cons**: slower, more flaky (dynamic content, network-dependent data), harder to isolate cause of diff
- **Best for**: critical user flows, landing pages, checkout flows

---

## 3. Tools

### Comparison Matrix

| Tool | Type | Environment | Cross-Browser | CI Integration | Pricing |
|---|---|---|---|---|---|
| **Playwright built-in** | Screenshot | Local/CI | Chromium, Firefox, WebKit | Any CI | Free (OSS) |
| **Percy (BrowserStack)** | Screenshot (cloud) | Cloud rendering | Chrome, Firefox, Safari, Edge | GitHub, GitLab, Bitbucket | Paid (free tier) |
| **Chromatic (Storybook)** | Component screenshot | Cloud rendering | Chrome, Firefox, Safari (via config) | GitHub, GitLab, Bitbucket | Paid (free tier) |
| **BackstopJS** | Screenshot | Local/Docker | Via Docker config | Any CI | Free (OSS) |
| **Applitools Eyes** | AI-powered screenshot | Cloud rendering | All major browsers | All major CI | Paid |

### Playwright Built-in (`toHaveScreenshot()`)

```typescript
// Basic usage
await expect(page).toHaveScreenshot();

// Named snapshot with threshold
await expect(page).toHaveScreenshot('hero-section.png', {
  maxDiffPixelRatio: 0.01, // allow 1% pixel difference
});

// Element-level screenshot
await expect(page.locator('.card')).toHaveScreenshot('card.png', {
  maxDiffPixels: 100,
});

// Mask dynamic content
await expect(page).toHaveScreenshot({
  mask: [page.locator('.timestamp'), page.locator('.ad-banner')],
});

// Full page
await expect(page).toHaveScreenshot({ fullPage: true });
```

**Update baselines**: `npx playwright test --update-snapshots`

**Configuration** (`playwright.config.ts`):
```typescript
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,        // per-pixel color diff threshold (0-1)
      animations: 'disabled', // freeze animations
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { viewport: { width: 375, height: 667 } } },
  ],
});
```

**Key details**:
- First run creates baseline (test fails with "missing snapshot" -- run again to pass)
- Snapshots stored in `__snapshots__` directory alongside test files
- Generates diff images on failure (expected, actual, diff)
- Platform-specific snapshots by default (Linux CI vs macOS local can differ)

### Percy (BrowserStack)

```typescript
// Playwright integration
import percySnapshot from '@percy/playwright';

test('homepage', async ({ page }) => {
  await page.goto('/');
  await percySnapshot(page, 'Homepage');
});

// With per-snapshot options
await percySnapshot(page, 'Dashboard', {
  widths: [375, 768, 1280],
  percyCSS: '.ad-banner { display: none; }',
});
```

**How it works**:
1. SDK serializes DOM + assets and uploads to Percy cloud
2. Percy renders in real browsers (not headless) at specified widths
3. Smart diff algorithm ignores anti-aliasing, highlights meaningful changes
4. Visual diff appears as PR check -- reviewers approve/reject in Percy UI

**Configuration** (`.percy.yml`):
```yaml
version: 2
snapshot:
  widths: [375, 768, 1280]
  min-height: 1024
  percy-css: |
    .dynamic-content { visibility: hidden; }
discovery:
  network-idle-timeout: 250
```

### Chromatic (Storybook)

```bash
# Run visual tests
npx chromatic --project-token=<token>
```

**How it works**:
1. Builds Storybook
2. Captures screenshot of every story, at every configured viewport, in every configured browser
3. Compares against baselines from accepted build
4. Diffs appear in Chromatic UI for review

**Story = test case**:
```typescript
// Button.stories.tsx -- each export = one visual test
export const Default: Story = {};
export const Primary: Story = { args: { variant: 'primary' } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const WithLongText: Story = { args: { children: 'A very long button label that might wrap' } };
```

**TurboSnap**: only re-tests stories whose dependency graph includes changed files. Dramatically reduces snapshot count (and cost) on incremental builds.

**Interaction testing**: Chromatic can capture screenshots after Storybook `play` functions execute (hover, click, fill form), testing interactive states.

### BackstopJS

```json
{
  "viewports": [
    { "label": "phone", "width": 320, "height": 480 },
    { "label": "tablet", "width": 1024, "height": 768 }
  ],
  "scenarios": [
    {
      "label": "Homepage",
      "url": "http://localhost:3000",
      "selectors": ["document"],
      "delay": 500,
      "misMatchThreshold": 0.1,
      "removeSelectors": [".ad-banner"]
    }
  ],
  "engine": "puppeteer",
  "dockerizedMode": true
}
```

**Commands**: `backstop test`, `backstop approve`, `backstop reference` (create new baselines).

**Strength**: Docker-based rendering ensures identical screenshots across developer machines and CI.

### Applitools Eyes

```typescript
import { Eyes, Target, MatchLevel } from '@applitools/eyes-playwright';

const eyes = new Eyes();
await eyes.open(page, 'MyApp', 'Login Page');

// Full page with layout match (ignores content, checks structure)
await eyes.check('Login Form', Target.window().fully().layout());

// Strict match (pixel-perfect)
await eyes.check('Logo', Target.region('.logo').strict());

// Content match (ignores styling, checks text content)
await eyes.check('Terms', Target.region('.terms').content());

await eyes.close();
```

**Match levels**:

| Level | What it compares | Use case |
|---|---|---|
| **Strict** | Pixel-level (with AI anti-aliasing tolerance) | Brand-critical UI (logo, hero) |
| **Layout** | Element positions and sizes, ignores text/colors | Dynamic content pages |
| **Content** | Text content, ignores styling/position | Localized pages |
| **Exact** | Raw pixel-by-pixel, no AI tolerance | Rarely used |

**Ultrafast Grid**: renders in parallel across browsers/viewports in Applitools cloud. Single DOM upload, multiple renderings.

---

## 4. Best Practices

### Threshold Management

| Setting | What it controls | Guidance |
|---|---|---|
| `maxDiffPixelRatio` | % of total pixels that can differ | 0.01 (1%) for full-page, 0.001 for components |
| `maxDiffPixels` | Absolute pixel count that can differ | Use for small, targeted element screenshots |
| `threshold` | Per-pixel color distance (0-1) | 0.2 handles anti-aliasing; lower = stricter |

**Rule**: start strict, loosen only when you understand why diffs occur. Never set thresholds so high they miss real regressions.

### Viewport Management

Test at real breakpoints, not arbitrary sizes:

```typescript
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },   // iPhone SE
  { name: 'tablet', width: 768, height: 1024 },   // iPad
  { name: 'desktop', width: 1280, height: 720 },  // Laptop
  { name: 'wide', width: 1920, height: 1080 },    // Full HD
];
```

**Priority**: test the breakpoints where your CSS media queries change behavior. Check your CSS for `@media` boundaries.

### Dynamic Content Handling

| Technique | When to use |
|---|---|
| **Mask regions** | Ads, timestamps, avatars, user-generated content |
| **Percy CSS / hide selectors** | Elements that change between runs |
| **Fixed timestamps** | `Date.now = () => 1700000000000` or `clock.setFixedTime()` |
| **Seed random data** | Faker with fixed seed, deterministic test fixtures |
| **Wait for idle** | Network idle, animation complete, font loaded |
| **Remove selectors** | BackstopJS `removeSelectors` for irrelevant elements |

### Deterministic Rendering Checklist

- [ ] **Disable animations**: CSS `* { animation: none !important; transition: none !important; }` or tool-level config
- [ ] **Freeze time**: mock `Date`, set timezone explicitly (`TZ=UTC`)
- [ ] **Load fonts**: wait for `document.fonts.ready` before capture
- [ ] **Consistent environment**: Docker container or cloud rendering (not local OS)
- [ ] **Network mocking**: stub API responses, no real external calls
- [ ] **Disable cursor blink**: prevents input field diffs
- [ ] **Stable scrollbar**: force scrollbar visibility or hide it

### Review Workflow

1. Developer pushes PR
2. CI runs visual tests, detects diffs
3. Tool (Percy/Chromatic/Applitools) posts PR status check: "X visual changes detected"
4. Reviewer opens visual diff UI -- side-by-side or overlay comparison
5. **Intentional change**: reviewer approves, new baseline is set
6. **Unintentional regression**: reviewer rejects, developer fixes
7. PR merges only after visual approval

**Key principle**: visual changes should never be silently accepted. Every diff requires a human decision.

### Baseline Management

- **Store baselines in version control** (Playwright) or **in the cloud tool** (Percy, Chromatic)
- **Branch-aware baselines**: feature branch inherits baselines from base branch, creates new baselines on merge
- **Update baselines atomically**: when a design system change affects many components, batch-approve all related diffs in one review
- **Never auto-accept**: auto-accepting defeats the purpose; treat visual approval like code review

---

## 5. Component-Level Strategy (Storybook + Chromatic)

### Story Coverage Model

Every component should have stories covering:

| State Category | Examples |
|---|---|
| **Default** | Component with typical props |
| **Variants** | Primary, secondary, outlined, ghost |
| **Sizes** | Small, medium, large |
| **Interactive states** | Hover, focus, active, disabled (use `play` functions) |
| **Content extremes** | Empty, minimal, maximum/overflow, long text, missing image |
| **Error states** | Validation error, load failure, timeout |
| **Loading states** | Skeleton, spinner, progressive load |
| **Responsive** | Configure Chromatic `viewports` per story via parameters |

### Configuration

```typescript
// .storybook/preview.ts
const preview: Preview = {
  parameters: {
    chromatic: {
      viewports: [375, 768, 1280],
      diffThreshold: 0.063, // Chromatic's default
      pauseAnimationAtEnd: true,
    },
  },
};
```

```typescript
// Per-story overrides
export const MobileOnly: Story = {
  parameters: {
    chromatic: { viewports: [375] },
  },
};

export const SkipVisualTest: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
  },
};
```

### TurboSnap

Chromatic traces the dependency graph of each story file. On a PR, only stories whose transitive dependencies include a changed file get re-snapshotted.

**Impact**: a change to `Button.tsx` re-tests stories for `Button`, `Card` (if it imports Button), `Form` (if it imports Button) -- but not `Icon` or `Table`.

**Requirement**: must use Webpack or Vite (Chromatic needs the dependency graph from the bundler).

---

## 6. CI/CD Integration

### Pipeline Placement

```
Unit Tests → Integration Tests → Visual Regression Tests → E2E Tests → Deploy
                                        ↑
                              Screenshot capture here
                            (app must be built/running)
```

Visual tests run **after** integration tests (code must be functional) and **before** deployment (regressions must be caught pre-release).

### CI Configuration Patterns

**Playwright visual tests in GitHub Actions**:
```yaml
visual-tests:
  runs-on: ubuntu-latest  # consistent OS for snapshots
  container:
    image: mcr.microsoft.com/playwright:v1.40.0-jammy  # pinned browser versions
  steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npx playwright test --project=visual
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: visual-diffs
        path: test-results/
```

**Chromatic in GitHub Actions**:
```yaml
chromatic:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0  # required for TurboSnap
    - run: npm ci
    - uses: chromaui/action@latest
      with:
        projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        onlyChanged: true  # TurboSnap
        exitZeroOnChanges: true  # don't fail CI; use PR status check instead
```

### PR Blocking Strategy

| Approach | How | When |
|---|---|---|
| **Hard block** | CI fails on any visual diff; merge blocked | Design-system repos, brand-critical apps |
| **Soft block** | CI passes, but PR status shows "changes detected"; review recommended | Feature apps with frequent UI changes |
| **Informational** | Visual diffs posted as PR comment; no blocking | Early adoption, low-risk internal tools |

**Recommended**: start with soft block. Hard block on design system / shared component repos.

### Storage and Retention

- **Playwright snapshots**: committed to repo (small files, ~50-200KB each). Use `.gitattributes` with `*.png binary` for clean diffs
- **Cloud tools (Percy/Chromatic)**: baselines stored in their cloud. Retention varies by plan (typically 30-90 days for free tiers)
- **CI artifacts**: upload diff images as build artifacts for debugging failed runs
- **Size management**: component-level screenshots (small, many) vs full-page screenshots (large, few) -- budget accordingly

### Parallel Execution

- **Playwright**: `--workers=4` or `fullyParallel: true` for local parallelism; shard across CI runners with `--shard=1/4`
- **Percy**: parallel test execution supported; Percy deduplicates and assembles snapshots from parallel workers
- **Chromatic**: parallelism handled server-side; all stories rendered concurrently in cloud

---

## 7. Connection to Architecture

### Clean Architecture Alignment

Visual regression tests verify the **outermost ring** of Clean Architecture -- the Frameworks & Drivers layer (UI). They are the only automated tests that validate what the user actually sees.

```
                   ┌─────────────────────────┐
                   │   Visual Regression      │  ← Tests this layer
                   │   Tests                  │
                   ├─────────────────────────┤
                   │  Frameworks & Drivers    │  ← UI components, CSS, layout
                   │  (React, Angular, etc.)  │
                   ├─────────────────────────┤
                   │  Interface Adapters      │  ← Presenters, view models
                   ├─────────────────────────┤
                   │  Use Cases               │
                   ├─────────────────────────┤
                   │  Entities                │
                   └─────────────────────────┘
```

### Design System as Visual Test Boundary

Design system components are **reusable visual test subjects**:

- Each component in the design system has Storybook stories
- Stories serve double duty: documentation + visual test cases
- Visual regression suite for the design system acts as a **contract** between design and engineering
- Downstream applications inherit visual guarantees from the design system's tested components

### Rozanski & Woods Usability Perspective

Visual regression testing directly supports the **Usability perspective** from R&W:

- **Consistency**: visual tests ensure UI consistency across pages and over time
- **Feedback**: tests verify loading states, error states, and transitions render correctly
- **Accessibility**: screenshot tests can catch contrast regressions, missing focus indicators (supplement with axe/lighthouse)

### Bounded Context UI Modules

In a modular frontend aligned with DDD Bounded Contexts:

- Each Bounded Context's UI module owns its own visual test suite
- **Shared kernel** (design system) has its own centralized visual tests
- Cross-context visual integration tests are kept minimal -- focus on composition boundaries
- Each team approves visual changes within their context independently

```
Bounded Context A (Orders)     Bounded Context B (Catalog)
├── components/                ├── components/
├── stories/                   ├── stories/
├── visual-tests/              ├── visual-tests/
│   └── __snapshots__/         │   └── __snapshots__/

Shared Kernel (Design System)
├── components/
├── stories/                   ← Chromatic runs here
├── visual-tests/
```

---

## Quick Decision Guide

| Question | Recommendation |
|---|---|
| Just starting with visual testing? | Playwright `toHaveScreenshot()` -- zero cost, already in your E2E tool |
| Design system with Storybook? | Chromatic -- purpose-built, TurboSnap, review workflow |
| Need cross-browser visual coverage? | Percy or Applitools -- cloud rendering in real browsers |
| Open source, self-hosted only? | BackstopJS with Docker for consistent rendering |
| AI-powered smart diffing needed? | Applitools Eyes -- layout/content/strict match levels |
| Tight budget, small team? | Playwright built-in + manual review of diff artifacts |
