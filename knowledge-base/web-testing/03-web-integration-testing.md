# Web Integration Testing -- Complete Reference

## 1. Testing Library Philosophy

### Core Principle

> "The more your tests resemble the way your software is used, the more confidence they can give you." -- Kent C. Dodds

Testing Library enforces **user-centric testing**: query the DOM the way users and assistive technologies do. Never test implementation details (internal state, component instance methods, CSS class names). Test observable behavior -- what the user sees, clicks, and reads.

### Query Priority (Most to Least Preferred)

| Priority | Query | Rationale |
|----------|-------|-----------|
| 1 | `getByRole` | Accessible to everyone (visual users, screen readers). Covers buttons, headings, dialogs, etc. |
| 2 | `getByLabelText` | Primary method for form fields. Tests label-input association. |
| 3 | `getByPlaceholderText` | Fallback when no label exists. |
| 4 | `getByText` | For non-interactive elements (paragraphs, spans, divs). |
| 5 | `getByDisplayValue` | For filled-in form elements (current value of input/select). |
| 6 | `getByAltText` | For images, area elements, custom elements with alt text. |
| 7 | `getByTitle` | Title attribute. Not consistently accessible. |
| 8 | `getByTestId` | **Last resort.** User cannot see or hear `data-testid`. Escape hatch for cases where no semantic query applies. |

**Why this order matters**: Queries higher in the list assert accessibility as a side effect. If you cannot query an element by role, it may indicate an accessibility defect in the component itself.

### Query Variants

Each query has three variants controlling wait behavior:

- **`getBy*`**: Synchronous. Throws if not found or multiple found. Use for elements that are already rendered.
- **`queryBy*`**: Synchronous. Returns `null` if not found. Use to assert element does NOT exist.
- **`findBy*`**: Asynchronous (returns Promise). Waits until element appears. Use for elements that appear after async operations (API calls, state transitions).

### user-event over fireEvent

`@testing-library/user-event` simulates **real browser interaction sequences**, not individual DOM events:

```javascript
// BAD: fires a single change event (not how users type)
fireEvent.change(input, { target: { value: 'hello' } });

// GOOD: types character by character, fires focus, keyDown, keyPress, input, keyUp per keystroke
await user.type(input, 'hello');

// GOOD: clicks with full pointer event sequence (pointerDown, mouseDown, pointerUp, mouseUp, click)
await user.click(button);
```

Key `user-event` interactions: `type`, `click`, `dblClick`, `hover`, `unhover`, `tab`, `keyboard`, `upload`, `selectOptions`, `deselectOptions`, `paste`, `clear`, `pointer`.

Always create a user-event instance per test:
```javascript
const user = userEvent.setup();
```

### Framework Variants

Testing Library is framework-agnostic. The core (`@testing-library/dom`) provides queries and utilities. Framework wrappers add rendering:

- **React Testing Library** (`@testing-library/react`): `render()`, `renderHook()`, `act()`
- **Vue Testing Library** (`@testing-library/vue`): `render()` with Vue plugin support
- **Angular Testing Library** (`@testing-library/angular`): `render()` with module/component setup
- **Svelte Testing Library** (`@testing-library/svelte`): `render()` for Svelte components
- **Preact, Solid, Marko**: community-maintained wrappers

All share the same query API. Tests are portable across frameworks at the query level.

---

## 2. Component Testing

### What Is a Component Test?

A component test renders a **single component with its real child components** and verifies behavior from the user's perspective. External dependencies (APIs, browser APIs, third-party services) are mocked. Internal child components are NOT mocked.

**Boundary**:
- Real: component tree, CSS, event handlers, local state, context/store reads
- Mocked: network requests (via MSW), timers (via `jest.useFakeTimers`), browser APIs (IntersectionObserver, etc.)

Component tests sit between unit tests and full integration tests. They verify that a component subtree collaborates correctly.

### Storybook as Component Development + Testing Platform

**Storybook** provides an isolated environment for developing, documenting, and testing UI components. Each **story** captures a specific component state.

**Component Story Format (CSF)**: The standard for writing stories. A CSF file is an ES module:

```javascript
// Button.stories.js
import { Button } from './Button';

// Default export = component metadata
export default {
  component: Button,
  title: 'UI/Button',
  args: { label: 'Click me' },           // default args for all stories
  argTypes: { onClick: { action: 'clicked' } },
  decorators: [withTheme],               // wrap all stories
};

// Named exports = stories
export const Primary = {
  args: { variant: 'primary' },
};

export const Disabled = {
  args: { variant: 'primary', disabled: true },
};

export const Loading = {
  args: { variant: 'primary', loading: true },
};
```

**Key CSF concepts**:
- `args`: serializable props passed to the component. Enable Controls panel.
- `argTypes`: metadata about args (actions, controls, descriptions).
- `decorators`: wrappers (providers, layout containers) applied at story, component, or global level.
- `loaders`: async data fetching before story render (e.g., fetch fixture data).
- `parameters`: story-level configuration (viewport, backgrounds, a11y settings).

### Storybook Interaction Tests (Play Functions)

**Play functions** turn stories into executable integration tests:

```javascript
import { within, userEvent, expect } from '@storybook/test';

export const FilledForm = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    await step('Fill in email', async () => {
      await user.type(canvas.getByLabelText('Email'), 'user@example.com');
    });

    await step('Submit form', async () => {
      await user.click(canvas.getByRole('button', { name: 'Submit' }));
    });

    await step('Verify success message', async () => {
      await expect(canvas.getByText('Form submitted')).toBeInTheDocument();
    });
  },
};
```

**Running interaction tests**:
- In browser: Storybook UI shows step-by-step execution with pass/fail
- In CI: `test-runner` package executes play functions headlessly via Playwright
- Command: `npx test-storybook --url http://localhost:6006`

**Benefits over standalone tests**:
- Visual debugging -- see the component while the test runs
- Steps are replayable in the Interactions panel
- Same test works as documentation, visual regression baseline, and functional test

### Portable Stories

**Portable stories** reuse Storybook stories in external test frameworks (Vitest, Jest, Playwright):

```javascript
// In a Vitest/Jest test file
import { composeStories } from '@storybook/react';
import * as stories from './Button.stories';

const { Primary, Loading } = composeStories(stories);

test('renders primary button', () => {
  render(<Primary />);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});

test('executes play function', async () => {
  const { container } = render(<FilledForm />);
  await FilledForm.play({ canvasElement: container });
});
```

`composeStories` applies all decorators, args, loaders, and play functions from the story definition. Single source of truth: change the story, all tests update.

---

## 3. MSW (Mock Service Worker)

### Architecture

MSW intercepts requests at the **network level** using a Service Worker (browser) or request interception (Node.js). Application code is completely unaware of the mock -- it makes real `fetch`/`XMLHttpRequest` calls that get intercepted before leaving the process.

```
Application Code  -->  fetch('/api/users')
                            |
                     [Service Worker / Node interceptor]
                            |
                     MSW Request Handler
                            |
                     Mock Response (never hits network)
```

**Why this matters**: No patching of `fetch`, no dependency injection of mock clients, no conditional logic in application code. The same application code runs in tests and production.

### Request Handlers

**REST handlers**:
```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

**GraphQL handlers**:
```javascript
import { graphql, HttpResponse } from 'msw';

export const handlers = [
  graphql.query('GetUsers', () => {
    return HttpResponse.json({
      data: { users: [{ id: 1, name: 'Alice' }] },
    });
  }),

  graphql.mutation('CreateUser', ({ variables }) => {
    return HttpResponse.json({
      data: { createUser: { id: 3, name: variables.name } },
    });
  }),
];
```

### Response Resolvers

Response resolvers can model complex server behavior:

```javascript
// Conditional responses
http.get('/api/users/:id', ({ params }) => {
  if (params.id === '404') {
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return HttpResponse.json({ id: params.id, name: 'Alice' });
}),

// One-time responses (passthrough after first call)
http.get('/api/health', () => {
  return HttpResponse.json({ status: 'ok' });
}, { once: true }),

// Network errors
http.get('/api/flaky', () => {
  return HttpResponse.error(); // simulates network failure
}),

// Delayed responses (test loading states)
http.get('/api/slow', async () => {
  await delay(2000);
  return HttpResponse.json({ data: 'finally' });
}),
```

### Why MSW > Manual Mocking

| Manual Mocking | MSW |
|---------------|-----|
| Patches `fetch`/`axios` at module level | Intercepts at network level |
| Test knows about HTTP client implementation | Test is HTTP-client agnostic |
| Breaks if you switch from axios to fetch | Works regardless of client library |
| Mocks leak between tests if cleanup fails | Worker resets cleanly |
| Cannot test middleware, interceptors, retry logic | All application networking code executes |
| Different mock setup per test framework | Same handlers work in Jest, Vitest, Storybook, Cypress, Playwright |

### Runtime Request Handlers (Per-Test Overrides)

Override default handlers for specific test scenarios without modifying the shared handler set:

```javascript
import { server } from './mocks/server';

test('shows error when API fails', async () => {
  // Override the default success handler for this test only
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    })
  );

  render(<UserList />);
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
});

// afterEach(() => server.resetHandlers()) restores defaults
```

**Pattern**: Define happy-path handlers globally. Override with error/edge cases per test.

### Integration with Testing Library

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// test setup (vitest.setup.js or jest.setup.js)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// test file
test('loads and displays users', async () => {
  render(<UserList />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(await screen.findByText('Alice')).toBeInTheDocument();
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

`onUnhandledRequest: 'error'` fails tests that make unexpected API calls -- catches missing handlers immediately.

### Integration with Storybook

```javascript
// .storybook/preview.js
import { initialize, mswLoader } from 'msw-storybook-addon';

initialize();

export default {
  loaders: [mswLoader],
};

// Component.stories.js
export const WithData = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([{ id: 1, name: 'Alice' }]);
        }),
      ],
    },
  },
};

export const WithError = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        }),
      ],
    },
  },
};
```

Each story gets its own network behavior. Same MSW handlers, different context.

### Critical Connection: Pact Contract Files to MSW Handlers

**Problem**: MSW handlers are mocks. Mocks drift from real APIs. Contract tests verify real API behavior. The connection is: **use Pact contract files to generate or validate MSW handlers**.

**Strategy**:

1. **Consumer Pact tests** generate contract files capturing real API interactions
2. **Provider verification** confirms the real API satisfies these contracts
3. **MSW handlers** in integration tests should reflect the same interactions

**Implementation approaches**:

```javascript
// Approach 1: Generate MSW handlers from Pact files
import pactFile from '../pacts/frontend-userService.json';

const handlers = pactFile.interactions.map((interaction) => {
  const { method, path } = interaction.request;
  const { status, body } = interaction.response;

  return http[method.toLowerCase()](path, () => {
    return HttpResponse.json(body, { status });
  });
});

// Approach 2: Validate MSW handlers against Pact contracts (CI check)
// Script reads Pact files and MSW handler files, verifies every
// Pact interaction has a corresponding MSW handler with matching shape

// Approach 3: Shared fixtures
// Pact tests and MSW handlers import from the same fixture files
// Pact test: .willRespondWith(200, userFixture)
// MSW handler: return HttpResponse.json(userFixture)
```

**The guarantee**: If Pact provider verification passes, and MSW handlers use the same response shapes, then integration tests using MSW are testing against realistic API behavior. The chain is: Pact verifies truth -> MSW mirrors truth -> integration tests use MSW -> tests reflect reality.

---

## 4. Integration Test Patterns

### Render with Providers

Real applications wrap components in providers (routing, state, i18n, theme). Integration tests must replicate this:

```javascript
function renderWithProviders(ui, options = {}) {
  const {
    initialRoute = '/',
    store = createTestStore(options.preloadedState),
    locale = 'en',
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false } }
      })}>
        <Provider store={store}>
          <IntlProvider locale={locale}>
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...renderOptions }), store };
}
```

**Key decisions**:
- `MemoryRouter` over `BrowserRouter` -- no real URL bar in tests
- `retry: false` on React Query -- tests should fail fast, not retry
- Fresh `QueryClient` per test -- no cache leakage
- Pass `preloadedState` for store initialization

### Test User Flows Across Multiple Components

```javascript
test('user searches for product and adds to cart', async () => {
  const user = userEvent.setup();
  renderWithProviders(<App />, { initialRoute: '/products' });

  // Search
  await user.type(screen.getByRole('searchbox'), 'laptop');
  await user.click(screen.getByRole('button', { name: /search/i }));

  // Wait for results
  expect(await screen.findByText('MacBook Pro')).toBeInTheDocument();

  // Add to cart
  await user.click(screen.getByRole('button', { name: /add to cart/i }));

  // Verify cart updated
  expect(screen.getByRole('status')).toHaveTextContent('1 item in cart');
});
```

This tests: routing, search component, API call (mocked by MSW), results rendering, cart state management, and status display -- all through user actions.

### API Boundary Testing with MSW

Test the full lifecycle: loading -> data -> user action -> API call -> response -> UI update.

```javascript
test('creates a new todo and displays it', async () => {
  const user = userEvent.setup();
  render(<TodoApp />);

  await user.type(screen.getByLabelText('New todo'), 'Buy groceries');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  // MSW handler for POST /api/todos returns the created todo
  expect(await screen.findByText('Buy groceries')).toBeInTheDocument();
});
```

### Error State Testing

```javascript
test('displays error message on server error', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    })
  );

  render(<UserList />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Failed to load users'
  );
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});

test('displays error on network failure', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.error();
    })
  );

  render(<UserList />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Network error');
});
```

### Loading State Testing

```javascript
test('shows skeleton while loading', async () => {
  // Delay response to observe loading state
  server.use(
    http.get('/api/users', async () => {
      await delay('infinite'); // never resolves
      return HttpResponse.json([]);
    })
  );

  render(<UserList />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
  // or: expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
});
```

### Form Validation Flows

```javascript
test('validates required fields before submission', async () => {
  const user = userEvent.setup();
  render(<RegistrationForm />);

  // Submit empty form
  await user.click(screen.getByRole('button', { name: /register/i }));

  // Check validation messages
  expect(screen.getByText('Email is required')).toBeInTheDocument();
  expect(screen.getByText('Password is required')).toBeInTheDocument();

  // Fill in invalid email
  await user.type(screen.getByLabelText('Email'), 'not-an-email');
  await user.tab(); // trigger blur validation

  expect(screen.getByText('Invalid email address')).toBeInTheDocument();

  // Fill in valid data
  await user.clear(screen.getByLabelText('Email'));
  await user.type(screen.getByLabelText('Email'), 'user@example.com');
  await user.type(screen.getByLabelText('Password'), 'SecurePass123!');
  await user.click(screen.getByRole('button', { name: /register/i }));

  // Verify success (API call made via MSW)
  expect(await screen.findByText('Registration successful')).toBeInTheDocument();
});
```

---

## 5. Server-Side Rendering (SSR) Testing

### Hydration Testing

Hydration is the process of attaching event handlers to server-rendered HTML. Hydration mismatches cause visual glitches or crashes.

**What to test**:
- Server-rendered HTML matches client expectations (no mismatch warnings)
- Interactive elements work after hydration
- State is correctly initialized from server-rendered data

```javascript
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

test('component hydrates without mismatch', () => {
  const serverHtml = renderToString(<App initialData={mockData} />);

  const container = document.createElement('div');
  container.innerHTML = serverHtml;
  document.body.appendChild(container);

  // Spy on console.error to detect hydration mismatches
  const consoleSpy = vi.spyOn(console, 'error');

  hydrateRoot(container, <App initialData={mockData} />);

  expect(consoleSpy).not.toHaveBeenCalledWith(
    expect.stringContaining('did not match')
  );
});
```

**Common hydration pitfalls**:
- `Date.now()` or `Math.random()` producing different values server vs client
- Browser-only APIs (`window.innerWidth`) used during render
- Conditional rendering based on `typeof window !== 'undefined'`
- Locale-dependent formatting differences

### SEO Validation

Test that server-rendered output contains critical SEO content:

```javascript
test('renders SEO-critical content in server HTML', () => {
  const html = renderToString(
    <StaticRouter location="/products/laptop">
      <App />
    </StaticRouter>
  );

  // Structured data present
  expect(html).toContain('"@type":"Product"');

  // Critical content in initial HTML (not client-rendered)
  expect(html).toContain('MacBook Pro');
  expect(html).toContain('$1,299');

  // Semantic headings present
  expect(html).toMatch(/<h1[^>]*>MacBook Pro<\/h1>/);
});
```

### Meta Tag Verification

```javascript
import { Helmet } from 'react-helmet'; // or framework equivalent

test('sets correct meta tags for product page', () => {
  renderToString(
    <StaticRouter location="/products/laptop">
      <App />
    </StaticRouter>
  );

  const helmet = Helmet.renderStatic();

  expect(helmet.title.toString()).toContain('MacBook Pro | Store');
  expect(helmet.meta.toString()).toContain('name="description"');
  expect(helmet.meta.toString()).toContain('Buy MacBook Pro');
  expect(helmet.meta.toString()).toContain('property="og:title"');
  expect(helmet.meta.toString()).toContain('property="og:image"');
  expect(helmet.link.toString()).toContain('rel="canonical"');
});

test('sets noindex for search results pages', () => {
  renderToString(
    <StaticRouter location="/search?q=laptop">
      <App />
    </StaticRouter>
  );

  const helmet = Helmet.renderStatic();
  expect(helmet.meta.toString()).toContain('name="robots" content="noindex"');
});
```

---

## 6. Connection to Architecture

### Integration Tests Verify Interface Adapter Layer (Clean Architecture)

In Clean Architecture, the **Interface Adapter layer** translates between the domain and external concerns (UI, API clients, persistence). Integration tests target this layer:

```
[Entity Layer]        <-- Unit tests (pure domain logic)
[Use Case Layer]      <-- Unit tests (application orchestration)
[Interface Adapters]  <-- INTEGRATION TESTS (controllers, presenters, gateways)
[Frameworks/Drivers]  <-- E2E tests (real browser, real database)
```

**What integration tests cover at this layer**:
- **Controllers/Presenters**: Do they correctly translate user actions into use case calls and format responses for the view?
- **API Gateways**: Do they correctly map HTTP responses to domain objects? (Tested via MSW)
- **View Models**: Does the presenter produce the right data shape for the component?

### Component Tests Verify View + Presenter Collaboration

A component test validates that the **View** (React component) and **Presenter** (state logic, hooks, formatting) collaborate correctly:

```
View (JSX)  <-->  Presenter (hook/logic)  <-->  Use Case (mocked at API boundary)
            ^
            |
    Component test boundary
```

The component test renders the view, triggers user actions, and asserts the rendered output. The presenter logic executes naturally. The API boundary is mocked by MSW. This verifies the View-Presenter contract without testing framework internals.

### MSW Mocks Represent Driven Port Boundaries

In Hexagonal Architecture, **Driven Ports** (also called secondary ports) are interfaces through which the application accesses external systems (databases, APIs, message queues).

MSW mocks sit exactly at the Driven Port boundary:

```
[Application Core]  -->  [Driven Port: UserRepository]  -->  [MSW intercepts here]
                                                                    |
                                                              (never reaches real API)
```

MSW handlers define the behavior of external systems from the application's perspective. Each handler is effectively an implementation of a Driven Port for testing purposes.

**Implication**: The set of MSW handlers for a test suite should map 1:1 to the Driven Ports the application defines. If you have a `PaymentGateway` port, you should have MSW handlers covering `/api/payments/*`.

### Testing Library Queries Should Use Ubiquitous Language

DDD's Ubiquitous Language should permeate test code. Testing Library queries naturally support this when the UI uses domain terms:

```javascript
// GOOD: queries use domain language from the Bounded Context
screen.getByRole('heading', { name: 'Order Summary' });
screen.getByLabelText('Shipping Address');
screen.getByRole('button', { name: 'Place Order' });
screen.getByText('Order #12345 confirmed');

// BAD: queries use technical/generic terms
screen.getByTestId('header-component');
screen.getByTestId('input-field-3');
screen.getByTestId('submit-btn');
```

If the domain calls it an "Order," the UI should label it "Order," and the test should query for "Order." This creates a three-way consistency: domain model, UI labels, and test assertions all speak the same language.

### One Test Suite per Bounded Context UI Module

Structure integration test suites to mirror Bounded Context boundaries:

```
src/
  contexts/
    ordering/
      components/
      hooks/
      __tests__/
        ordering.integration.test.js    <-- tests the Ordering BC UI
        ordering.msw-handlers.js        <-- MSW handlers for Ordering APIs
    catalog/
      components/
      hooks/
      __tests__/
        catalog.integration.test.js     <-- tests the Catalog BC UI
        catalog.msw-handlers.js         <-- MSW handlers for Catalog APIs
    shipping/
      ...
```

**Rules**:
- Each Bounded Context's test suite owns its MSW handlers (its API contract assumptions)
- Cross-context integration is tested at the application shell level, not within BC tests
- Shared MSW handlers (authentication, common infrastructure) live in a shared test utilities module
- When a Pact contract exists for a BC's API, the MSW handlers for that BC should derive from or align with the Pact contract file

**The chain of trust**:
1. **Pact contract** verifies provider API behavior (truth)
2. **MSW handlers** mirror Pact contracts (faithful mock)
3. **Integration tests** use MSW handlers (realistic testing)
4. **Testing Library queries** use Ubiquitous Language (domain alignment)
5. **Test suite per BC** maintains modularity (architectural alignment)

---

## Sources

- [Testing Library Documentation -- Core API](https://testing-library.com/docs/)
- [Testing Library Documentation -- Query Priority](https://testing-library.com/docs/queries/about#priority)
- [Testing Library -- user-event](https://testing-library.com/docs/user-event/intro)
- [Kent C. Dodds -- Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Storybook Documentation -- Component Story Format](https://storybook.js.org/docs/api/csf)
- [Storybook Documentation -- Interaction Tests](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Storybook Documentation -- Portable Stories](https://storybook.js.org/docs/api/portable-stories)
- [MSW Documentation -- Getting Started](https://mswjs.io/docs/)
- [MSW Documentation -- Request Handlers](https://mswjs.io/docs/concepts/request-handler)
- [MSW Documentation -- Response Resolver](https://mswjs.io/docs/concepts/response-resolver)
- [MSW Storybook Addon](https://github.com/mswjs/msw-storybook-addon)
- [Pact Documentation -- Consumer-Driven Contracts](https://docs.pact.io/)
- [Robert C. Martin -- Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
