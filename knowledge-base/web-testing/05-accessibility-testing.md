# Accessibility Testing (a11y): Complete Reference

## Why Accessibility Matters

### Legal Requirements

| Jurisdiction | Legislation | Scope |
|---|---|---|
| **United States** | ADA (Americans with Disabilities Act) | Public accommodations, including websites of businesses open to the public. DOJ increasingly interprets as covering web. |
| **European Union** | EN 301 549 (harmonized standard) + European Accessibility Act (2025) | Public sector websites/apps mandatory; private sector digital products and services from June 2025. |
| **Canada** | Accessibility for Ontarians with Disabilities Act (AODA) | Ontario organizations with 50+ employees must make web content WCAG 2.0 AA. Federal: Accessible Canada Act (2019). |
| **United Kingdom** | Equality Act 2010 + Public Sector Bodies Accessibility Regulations 2018 | Public sector must meet WCAG 2.1 AA. |

Lawsuits are increasing: 4,600+ ADA digital accessibility lawsuits filed in the US in 2023 alone.

### Business Case

- ~15% of the world population (1.3 billion people) has some form of disability
- Accessible sites have better SEO, wider reach, and lower bounce rates
- **Curb-cut effect**: features built for accessibility benefit everyone (captions help in noisy environments, keyboard nav helps power users, high contrast helps in sunlight)
- Inaccessible products exclude paying customers

### Connection to R&W Accessibility Perspective

The Rozanski & Woods (R&W) Software Architecture framework defines **Accessibility** as a quality perspective applied across all views. Treating WCAG compliance as an architectural constraint (non-functional requirement) ensures it is addressed systematically rather than bolted on after development.

---

## WCAG (Web Content Accessibility Guidelines)

### Versions

| Version | Status | Key Additions |
|---|---|---|
| **WCAG 2.0** (2008) | ISO standard (ISO/IEC 40500) | Foundational 12 guidelines, 61 success criteria |
| **WCAG 2.1** (2018) | W3C Recommendation | Added 17 criteria for mobile, low vision, cognitive — builds on 2.0 |
| **WCAG 2.2** (2023) | W3C Recommendation | Added 9 criteria: focus appearance, dragging movements, accessible authentication, redundant entry |
| **WCAG 3.0** | Working draft | New conformance model (bronze/silver/gold), broader scope — not yet stable |

### Four Principles: POUR

```
P — Perceivable    Content must be presentable in ways users can perceive
O — Operable       UI components and navigation must be operable
U — Understandable Information and UI operation must be understandable
R — Robust         Content must be robust enough for diverse user agents / assistive tech
```

### Three Conformance Levels

| Level | Description | Target? |
|---|---|---|
| **A** | Minimum — removes the most severe barriers | Bare minimum, rarely sufficient |
| **AA** | Standard target for most organizations | **Industry standard. Legal baseline in most jurisdictions.** |
| **AAA** | Highest — not always achievable for all content | Aspirational. Apply where feasible. |

### Most Commonly Failed Success Criteria

#### Perceivable

| Criterion | Level | What It Requires | Common Failure |
|---|---|---|---|
| **1.1.1 Non-text Content** | A | All images have text alternatives | Missing or meaningless `alt` attributes |
| **1.3.1 Info and Relationships** | A | Structure conveyed visually is also in markup | Using `<div>` instead of semantic elements; missing form labels |
| **1.4.3 Contrast (Minimum)** | AA | 4.5:1 for normal text, 3:1 for large text | Low contrast brand colors, placeholder text |
| **1.4.11 Non-text Contrast** | AA | 3:1 for UI components and graphical objects | Icon buttons, form field borders invisible |

#### Operable

| Criterion | Level | What It Requires | Common Failure |
|---|---|---|---|
| **2.1.1 Keyboard** | A | All functionality via keyboard | Click handlers on `<div>` without keyboard support |
| **2.4.3 Focus Order** | A | Sequential focus order preserves meaning | Modals not trapping focus; DOM order differs from visual order |
| **2.4.7 Focus Visible** | AA | Keyboard focus indicator is visible | `outline: none` in CSS with no replacement |
| **2.4.11 Focus Not Obscured (Minimum)** | AA (2.2) | Focused element not fully hidden by other content | Sticky headers/footers covering focused elements |

#### Understandable

| Criterion | Level | What It Requires | Common Failure |
|---|---|---|---|
| **3.1.1 Language of Page** | A | Page has `lang` attribute | Missing `<html lang="en">` |
| **3.3.2 Labels or Instructions** | A | Inputs have labels or instructions | Placeholder-only inputs with no `<label>` |
| **3.3.8 Accessible Authentication (Minimum)** | AA (2.2) | No cognitive function test for login | CAPTCHAs without alternatives |

#### Robust

| Criterion | Level | What It Requires | Common Failure |
|---|---|---|---|
| **4.1.2 Name, Role, Value** | A | Custom components expose name, role, state | Custom dropdowns/tabs without ARIA |
| **4.1.3 Status Messages** | AA | Status messages communicated via ARIA live | Toast notifications not announced by screen readers |

---

## Types of Accessibility Testing

```
Automated Testing ──→ catches ~30-40% of issues (structural violations)
       +
Manual Testing ─────→ keyboard nav, screen reader, cognitive load review
       +
User Testing ───────→ people with actual disabilities using the product
       =
Comprehensive Coverage
```

**Automated alone is insufficient.** It catches markup errors (missing alt text, missing labels, contrast ratios, ARIA misuse) but cannot evaluate whether alt text is meaningful, whether focus order is logical, or whether a screen reader experience makes sense.

| Method | Catches | Cannot Catch |
|---|---|---|
| **Automated** | Missing attributes, contrast, duplicate IDs, ARIA syntax | Quality of alt text, logical reading order, cognitive complexity |
| **Manual** | Keyboard flow, focus management, screen reader experience | Edge cases from diverse disabilities and AT configurations |
| **User testing** | Real-world usability with assistive technology | Does not scale — use for validation, not primary detection |

---

## Automated Testing Tools

### axe-core (Deque Systems)

The de facto accessibility rules engine. Open source (MPL-2.0). Powers most other tools.

**Core Concepts:**

| Concept | Description |
|---|---|
| **Rules** | Individual checks (e.g., `image-alt`, `color-contrast`). 90+ rules. |
| **Rulesets** | Grouped sets: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice` |
| **Impact levels** | `critical` > `serious` > `moderate` > `minor` |
| **Results** | `violations` (failures), `passes`, `incomplete` (needs manual review), `inapplicable` |

**Ecosystem:**

| Package | Use Case |
|---|---|
| `axe-core` | Core engine — run in any browser context |
| `@axe-core/playwright` | Integrate axe into Playwright E2E tests |
| `@axe-core/react` | Dev-time console warnings in React apps |
| `jest-axe` | Jest/Vitest assertion matcher for unit/integration tests |
| `@axe-core/cli` | CLI runner for quick checks |

**jest-axe example (component test):**

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**@axe-core/playwright example (E2E test):**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page should have no a11y violations', async ({ page }) => {
  await page.goto('/dashboard');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('#third-party-widget')  // exclude elements you don't control
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Lighthouse

Google's web auditing tool. Accessibility is one of five audit categories (Performance, Accessibility, Best Practices, SEO, PWA).

- Uses axe-core under the hood for many checks, plus additional audits
- Score 0-100; **target: 90+** for CI gates
- **Lighthouse CI** (`lhci`): run in pipelines, assert thresholds, track trends

```yaml
# lighthouserc.yml
ci:
  assert:
    assertions:
      categories:accessibility:
        - error
        - minScore: 0.9
```

### Pa11y

CLI-based accessibility testing. Good for CI pipelines and batch-checking multiple URLs.

```bash
# Single URL
pa11y https://example.com

# With WCAG 2.1 AA standard
pa11y --standard WCAG2AA https://example.com

# CI runner for multiple URLs
pa11y-ci --config pa11y-ci.config.json
```

### WAVE (WebAIM)

Browser extension for manual visual review. Shows errors, alerts, structural elements, and ARIA directly on the page. Not automatable — use for developer exploration and manual audits.

### Tool Comparison

| Tool | Type | CI-Friendly | Engine | Best For |
|---|---|---|---|---|
| **axe-core** | Library/API | Yes | axe | Integration into test suites |
| **Lighthouse** | CLI/Browser | Yes (LHCI) | axe + custom | Broad web quality audits |
| **Pa11y** | CLI | Yes | HTML_CodeSniffer or axe | Batch URL checking |
| **WAVE** | Browser extension | No | Custom | Visual manual review |

---

## Testing Patterns

### Component-Level Testing

Every component passes axe check in isolation. Catches issues at the smallest unit.

```typescript
// Each component in the design system has this test
describe('Button', () => {
  it('meets a11y requirements', async () => {
    const { container } = render(<Button onClick={fn}>Submit</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('meets a11y requirements when disabled', async () => {
    const { container } = render(<Button disabled>Submit</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

### Page-Level Testing

Full page composition — catches issues from component interaction (duplicate IDs, heading hierarchy, landmark structure).

```typescript
test('dashboard page a11y', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### User Flow Testing (Keyboard-Only)

Complete journeys navigated entirely by keyboard.

```typescript
test('checkout flow is keyboard-accessible', async ({ page }) => {
  await page.goto('/cart');

  // Navigate to checkout button via Tab
  await page.keyboard.press('Tab');  // skip nav
  await page.keyboard.press('Enter'); // activate skip link
  // ... navigate through form fields
  await page.keyboard.press('Tab');
  await expect(page.locator('#email')).toBeFocused();

  // Fill form without mouse
  await page.keyboard.type('user@example.com');
  await page.keyboard.press('Tab');
  // ... complete flow
});
```

### Form Accessibility

| Requirement | Implementation |
|---|---|
| Every input has a label | `<label for="id">` or `aria-label` / `aria-labelledby` |
| Error messages linked to inputs | `aria-describedby` pointing to error element |
| Required fields indicated | `aria-required="true"` or `required` attribute + visual indicator |
| Error summary on submit | Focus moves to error summary; announced via `aria-live` or focus |
| Autocomplete attributes | `autocomplete="email"` etc. for WCAG 1.3.5 |

### Dynamic Content

| Pattern | Implementation |
|---|---|
| **Toast / status messages** | `role="status"` or `aria-live="polite"` |
| **Urgent alerts** | `role="alert"` or `aria-live="assertive"` |
| **Loading indicators** | `aria-busy="true"` on the updating region |
| **Modal focus trap** | On open: move focus into modal. Trap Tab within. On close: return focus to trigger. |
| **Single-page app route changes** | Announce new page title via live region or focus management |

### Color Contrast Checking

| Text Type | WCAG AA Ratio | WCAG AAA Ratio |
|---|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 | 7:1 |
| Large text (>= 18pt / >= 14pt bold) | 3:1 | 4.5:1 |
| UI components and graphics | 3:1 | Not defined |

Tools: Chrome DevTools contrast checker, axe-core `color-contrast` rule, Colour Contrast Analyser (CCA) app.

**Never rely on color alone** to convey information (WCAG 1.4.1). Add icons, patterns, or text labels.

---

## Keyboard Navigation Testing

### Checklist

| Check | What to Verify |
|---|---|
| **Tab order** | Follows logical reading order. Use `tabindex="0"` to add to flow, never `tabindex` > 0. |
| **Focus visible** | Every interactive element shows a clear focus indicator. Never `outline: none` without replacement. |
| **Focus trap (modals)** | Tab cycles within modal. Escape closes. Focus returns to trigger on close. |
| **Skip navigation** | First Tab stop is a "Skip to main content" link. |
| **No keyboard traps** | User can always Tab away from any component (WCAG 2.1.2). |
| **All functionality** | Every action achievable with mouse is also achievable with keyboard. |
| **Custom widgets** | Arrow keys for internal navigation (tabs, menus, tree views). Enter/Space to activate. |

### Expected Keyboard Interactions (WAI-ARIA Authoring Practices)

| Widget | Keys |
|---|---|
| **Button** | Enter or Space to activate |
| **Link** | Enter to activate |
| **Tabs** | Arrow keys to switch tabs, Tab to move into tab panel |
| **Menu** | Arrow keys to navigate, Enter to select, Escape to close |
| **Dialog** | Tab cycles within, Escape to close |
| **Combobox** | Arrow keys for options, Enter to select, Escape to close listbox |
| **Accordion** | Enter/Space to expand/collapse, Arrow keys between headers |

---

## Screen Reader Testing

### Screen Readers by Platform

| Screen Reader | Platform | Cost | Primary Browser |
|---|---|---|---|
| **NVDA** | Windows | Free (open source) | Firefox, Chrome |
| **JAWS** | Windows | Paid (commercial license) | Chrome, Edge |
| **VoiceOver** | macOS / iOS | Built-in | Safari |
| **TalkBack** | Android | Built-in | Chrome |
| **Narrator** | Windows | Built-in | Edge |

**Minimum test matrix**: VoiceOver + Safari (macOS), NVDA + Firefox (Windows). Add mobile if applicable.

### Semantic HTML First, ARIA Second

```
Rule 1: Don't use ARIA if native HTML works
         <button> not <div role="button">
         <nav>    not <div role="navigation">
         <input type="checkbox"> not <div role="checkbox">

Rule 2: Don't change native semantics
         <h2 role="tab"> ✗  →  <div role="tab"><h2>...</h2></div> ✓

Rule 3: All interactive ARIA controls must be keyboard-usable

Rule 4: Don't use role="presentation" or aria-hidden="true" on focusable elements

Rule 5: All interactive elements must have an accessible name
```

### Common ARIA Patterns

| Pattern | Key ARIA | Notes |
|---|---|---|
| **Dialog (modal)** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` | Must trap focus. Return focus on close. |
| **Tabs** | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` | Arrow key navigation between tabs. |
| **Combobox** | `role="combobox"`, `aria-expanded`, `aria-activedescendant` | Complex — follow APG pattern exactly. |
| **Menu** | `role="menu"`, `role="menuitem"`, `aria-haspopup` | For application menus, NOT site navigation. |
| **Tree view** | `role="tree"`, `role="treeitem"`, `aria-expanded` | Arrow key navigation with expand/collapse. |
| **Alert** | `role="alert"` | Implicitly `aria-live="assertive"`. Use sparingly. |
| **Live region** | `aria-live="polite"` or `"assertive"` | Polite waits for idle; assertive interrupts. |

Reference: [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)

---

## CI/CD Integration

### Pipeline Architecture

```
PR Created / Updated
  │
  ├─→ Component Tests (jest-axe)
  │     └─ Each component checked for axe violations
  │
  ├─→ E2E Tests (Playwright + @axe-core/playwright)
  │     └─ Key pages and flows checked for axe violations
  │
  ├─→ Lighthouse CI
  │     └─ Accessibility score >= 90 (configurable threshold)
  │
  └─→ Report Generation
        └─ HTML/JSON report of all violations with impact level
```

### Gate Strategy

| Gate | Tool | Blocks PR? | What It Catches |
|---|---|---|---|
| Component a11y | jest-axe | Yes — on any violation | Missing labels, ARIA errors, contrast in components |
| Page a11y | @axe-core/playwright | Yes — on critical/serious | Full-page structural issues, landmark errors |
| Lighthouse score | Lighthouse CI | Yes — if below threshold | Broad accessibility regression |
| Manual review | WAVE + screen reader | No — advisory | Logical order, meaningful content, usability |

### Playwright + axe Report Generation

```typescript
// playwright.config.ts — global setup for a11y reports
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';

test.afterEach(async ({ page }, testInfo) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  // Attach violations to test report
  if (results.violations.length > 0) {
    await testInfo.attach('a11y-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
  }
});
```

### Preventing Regressions

- **Baseline approach**: store known violations count; fail if new violations appear
- **Zero-tolerance**: fail on any violation (ideal for new projects)
- **Incremental**: fail only on critical/serious; warn on moderate/minor

```typescript
// Only fail on critical and serious
const critical = results.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
);
expect(critical).toEqual([]);
```

---

## Connection to Architecture

### R&W Accessibility Perspective

In the Rozanski & Woods framework, Accessibility is a **perspective** (cross-cutting concern) applied to architectural views. It is not a single component but a quality attribute that influences:

- **Functional view**: components must expose accessible interfaces
- **Information view**: content must be perceivable in multiple modalities
- **Development view**: design system enforces a11y by default

### Architectural Decisions

| Decision | Rationale |
|---|---|
| **Design system enforces a11y by default** | All base components (Button, Input, Modal, etc.) are WCAG AA compliant out of the box. Developers compose accessible UIs without extra effort. |
| **WCAG AA as non-functional requirement** | Treated as a constraint in ADRs, same as performance or security budgets. |
| **Semantic HTML mandate** | Architectural guideline: use native HTML elements before ARIA. Reduces bug surface. |
| **Automated a11y gates in CI** | Prevents regression. Shifts left — catch issues before code review. |
| **Accessibility audit in Definition of Done** | Every story includes a11y acceptance criteria. |

### AWS Well-Architected Framework

AWS WAF has **no direct equivalent** to an accessibility perspective. Accessibility is purely application-layer UX concern, not infrastructure. This is R&W territory — AWS WAF addresses operational, security, reliability, performance, cost, and sustainability pillars, none of which cover end-user accessibility.

---

## Quick Reference: Getting Started Checklist

```
□ Add <html lang="en"> to every page
□ Ensure all images have meaningful alt text (or alt="" for decorative)
□ Use semantic HTML: <button>, <nav>, <main>, <header>, <h1>-<h6>
□ Every form input has a visible <label>
□ Color contrast meets 4.5:1 (normal text) / 3:1 (large text)
□ All functionality works with keyboard only
□ Focus indicators are visible on every interactive element
□ Modals trap focus and return focus on close
□ Add jest-axe tests to component test suite
□ Add @axe-core/playwright checks to E2E test suite
□ Set up Lighthouse CI with accessibility score gate >= 90
□ Test with at least one screen reader (VoiceOver or NVDA)
□ Never suppress outline without a visible replacement
□ Use aria-live for dynamic content updates
□ Include a skip navigation link
```
