# Frontend State and Data Management

## 1. State Categories

| Category | Nature | Lifetime | Examples |
|---|---|---|---|
| **Server state** | Async, cached, shared, potentially stale. Owned by the server | Persisted remotely; local copy is a cache | User profile, product list, order history |
| **Client state** | Synchronous, local, ephemeral. Owned by the UI | Component mount or session | Modal open/closed, selected tab, sidebar collapsed |
| **URL state** | Serialized in the address bar. Shareable, bookmarkable | Navigation session; survives refresh | Route params (`/orders/:id`), query params (`?page=2&sort=date`) |
| **Form state** | Complex local state with validation, dirty tracking, submission lifecycle | Form mount to submission | Field values, touched/dirty flags, validation errors, submit status |

**Key insight** — Most problems developers solve with "global state" are actually **server state
caching** problems. Before reaching for Redux, ask: "Is this data from an API?" If yes, use a
server state tool (TanStack Query, SWR, Apollo). Reserve client state tools for genuinely
UI-only concerns.

---

## 2. Server State Management

Server state is data you do not own. You borrow a copy, which can become stale the moment it
arrives. Server state tools solve: fetching, caching, synchronizing, deduplicating, background
refreshing, and optimistic updating.

### TanStack Query (React Query)

The dominant server state library for REST/fetch-based apps.

**Core mental model** — Every piece of server data is identified by a **query key**. The library
manages a cache keyed by these keys and handles staleness, refetching, and garbage collection
automatically.

| Concept | Description |
|---|---|
| **Query key** | Unique identifier for cached data. Usually `['entity', id]` or `['entity', 'list', filters]`. Hierarchical — invalidating `['orders']` invalidates all order queries |
| **Stale time** | Duration a cached response is considered fresh. While fresh, no refetch occurs. Default `0` (immediately stale). Set higher for data that changes infrequently |
| **Cache time (gcTime)** | Duration unused cached data stays in memory before garbage collection. Default 5 min. Allows instant display when user revisits a page |
| **Background refetch** | When stale data exists, show it immediately, refetch in background, swap in fresh data. User sees content instantly, then gets update |
| **Retry** | Automatic retry with exponential backoff on failed queries |

**Invalidation strategies** — After a mutation succeeds, stale data must be refreshed:

```
// Direct invalidation — refetch all matching queries
queryClient.invalidateQueries({ queryKey: ['orders'] })

// Optimistic cache update — set new data without refetch
queryClient.setQueryData(['orders', id], updatedOrder)

// Targeted invalidation — exact key only
queryClient.invalidateQueries({ queryKey: ['orders', id], exact: true })
```

**Optimistic updates** with TanStack Query:

```
useMutation({
  mutationFn: updateOrder,
  onMutate: async (newOrder) => {
    await queryClient.cancelQueries({ queryKey: ['orders', newOrder.id] })
    const previous = queryClient.getQueryData(['orders', newOrder.id])
    queryClient.setQueryData(['orders', newOrder.id], newOrder)  // optimistic
    return { previous }
  },
  onError: (err, newOrder, context) => {
    queryClient.setQueryData(['orders', newOrder.id], context.previous)  // rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })  // refetch truth
  },
})
```

**Infinite queries** — For pagination / infinite scroll. `useInfiniteQuery` manages an array of
pages. `getNextPageParam` extracts the cursor from the last page. `fetchNextPage` appends.

### SWR (Stale-While-Revalidate)

Vercel's lighter alternative. Same core pattern: return cached data immediately (stale), revalidate
in background, swap when ready. Simpler API than TanStack Query, fewer features (no built-in
mutation helpers, no query invalidation hierarchy). Good for read-heavy apps with simple mutation
patterns.

### Apollo Client (GraphQL)

| Feature | Description |
|---|---|
| **Normalized cache** | Stores entities by `__typename:id`. A query result is decomposed into individual entities. Updating one entity automatically updates every query that references it |
| **Local state** | `@client` directive allows mixing server and local fields in the same query |
| **Reactive variables** | `makeVar()` creates observable variables outside the cache. Read anywhere, trigger re-renders on change |
| **Optimistic response** | `optimisticResponse` option on `mutate()` — Apollo immediately applies the predicted result to the normalized cache, rolls back on error |

Normalized cache is powerful but complex. Cache misses on nested objects require careful `typePolicies`
configuration. TanStack Query's document cache is simpler but requires manual invalidation.

### RTK Query (Redux Toolkit Query)

Built into Redux Toolkit. Defines **API slices** with endpoints. Each endpoint auto-generates hooks
(`useGetOrdersQuery`, `useUpdateOrderMutation`).

| Feature | Description |
|---|---|
| **Cache tags** | Tag query results with labels (`['Order']`). Mutations declare which tags they invalidate. Automatic refetch of tagged queries |
| **Auto re-fetching** | When tags are invalidated, subscribed components automatically refetch |
| **Cache lifecycle** | `keepUnusedDataFor` controls GC. Default 60 seconds |
| **Streaming updates** | `onCacheEntryAdded` lifecycle for WebSocket integration |

Best when: already using Redux, need unified devtools for client + server state.

### Connection to CQRS

Server state queries = **read model projections**. The UI fetches a pre-shaped view of data
optimized for display. Mutations = **commands** sent to the write side. The query cache is a local
read model. Invalidation after mutation mirrors CQRS eventual consistency — the read model is
updated asynchronously after the command succeeds.

---

## 3. Client State Management

Client state is data the UI owns entirely. No server involved. The spectrum runs from local
component state to shared application state.

### Decision Framework

```
Is this state used by only one component?
  └─ Yes → useState / useReducer (local state)

Is this shared state that changes infrequently?
  └─ Yes → Context API (theme, locale, auth status)

Is this shared state with moderate complexity?
  └─ Yes → Zustand (simple global store, no boilerplate)

Is this complex state with many transitions, middlewares, or debugging needs?
  └─ Yes → Redux Toolkit (structured, excellent devtools)

Is this many independent pieces of state consumed by many components?
  └─ Yes → Jotai / Recoil (atomic, fine-grained subscriptions)
```

### Local State — useState / useReducer

**useState** — Single values, toggles, counters. The default choice.

**useReducer** — When next state depends on previous state, or when state transitions are complex
enough to name. Mirrors the Redux pattern at component scope.

```
// useReducer for state with named transitions
function reducer(state, action) {
  switch (action.type) {
    case 'OPEN_MODAL': return { ...state, isOpen: true, selectedId: action.id }
    case 'CLOSE_MODAL': return { ...state, isOpen: false, selectedId: null }
  }
}
```

**Rule** — Start with local state. Hoist only when a sibling or distant component needs it.

### Context API

React's built-in sharing mechanism. Provides a value to a subtree without prop drilling.

**Appropriate for**: theme, locale, auth user, feature flags — data that changes rarely and is
consumed broadly.

**Inappropriate for**: frequently changing data. Every Context value change re-renders every
consumer. No selector mechanism — consumers cannot subscribe to a slice.

### Zustand

Minimal global store. No providers, no boilerplate. Direct subscription with selectors.

```
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))

// Component subscribes to only `count` — re-renders only when count changes
const count = useStore((s) => s.count)
```

**Strengths** — Tiny API, works outside React (vanilla JS), supports middleware (persist, devtools,
immer), selector-based subscriptions prevent unnecessary re-renders.

### Redux Toolkit

For complex client state: many state transitions, middleware requirements (logging, analytics),
time-travel debugging needs.

| Concept | Description |
|---|---|
| **Slices** | `createSlice` — define reducers and actions in one place. Immer-powered immutable updates with mutable syntax |
| **Thunks** | `createAsyncThunk` — async actions with pending/fulfilled/rejected lifecycle |
| **Selectors** | `createSelector` (reselect) — memoized derived state |
| **DevTools** | Full state history, action replay, time-travel debugging |

**When to use** — Large team, many developers, complex client-side workflows. Redux's structure and
devtools justify the boilerplate overhead. Avoid for server state — use RTK Query instead.

### Jotai / Recoil (Atomic State)

State is broken into independent **atoms**. Components subscribe to individual atoms. Fine-grained
reactivity — changing one atom re-renders only its subscribers, not the entire tree.

**Jotai** — Minimal, bottom-up. Atoms are primitives. Derived atoms compute from other atoms.
No string keys required. Closer to signals.

**Recoil** — Meta's approach. Atoms + selectors. String keys for debugging. Supports async
selectors natively. More opinionated than Jotai. (Note: Recoil's maintenance has slowed; Jotai
is generally preferred for new projects.)

---

## 4. State Patterns

### Lifting State Up

When two sibling components need shared state, move it to their closest common ancestor. Pass state
down as props, callbacks up for mutations. Simple, explicit, traceable. Do this before reaching for
any external state library.

### State Colocation

**Keep state as close to where it's used as possible.** If only one component reads and writes a
value, it belongs in that component. Resist the urge to put everything in global state "just in
case." Colocation improves performance (fewer re-renders), readability (state near its usage), and
maintainability (delete the component, delete the state).

### Derived State (Don't Store What You Can Compute)

```
// BAD — storing derived state
const [items, setItems] = useState([])
const [filteredItems, setFilteredItems] = useState([])  // derived from items + filter

// GOOD — compute during render
const filteredItems = useMemo(
  () => items.filter(item => item.status === activeFilter),
  [items, activeFilter]
)
```

In Redux: use `createSelector` to derive data from store. In Zustand: compute in selectors. In
Apollo: use `@client` computed fields. In Jotai: use derived atoms.

**Principle** — A single source of truth for each piece of data. Everything else is a computation.

### State Machines (XState)

For UI flows with well-defined states and transitions: multi-step wizards, async processes,
complex modals, drag-and-drop, authentication flows.

```
// Order editing flow as a state machine
const orderMachine = createMachine({
  initial: 'viewing',
  states: {
    viewing: { on: { EDIT: 'editing' } },
    editing: {
      on: {
        SAVE: 'saving',
        CANCEL: 'viewing',
      },
    },
    saving: {
      invoke: { src: 'saveOrder', onDone: 'viewing', onError: 'editing' },
    },
  },
})
```

**Advantages** — Impossible states are literally impossible. Every transition is explicit and
enumerable. Generates visualizable statecharts. Excellent for complex async flows where boolean
flag combinations become unmanageable (`isLoading && !isError && isRetrying`).

**Connection to DDD** — An aggregate's lifecycle is a state machine. XState statecharts directly
model aggregate state transitions. `Order` aggregate states (Draft, Placed, Shipped, Delivered)
map to XState states, with domain events as transitions.

---

## 5. Optimistic Updates

Update the UI immediately when the user acts. Confirm or roll back when the server responds. The
user perceives zero latency for most operations.

### Pattern

```
1. User clicks "Complete Order"
2. UI immediately shows order as completed (optimistic)
3. Send mutation to server
4. Server confirms → keep UI as-is
   Server rejects → roll back UI to previous state, show error
```

### Implementation with TanStack Query

See the `useMutation` example in Section 2. The key callbacks:

| Callback | Purpose |
|---|---|
| `onMutate` | Cancel in-flight queries. Snapshot previous data. Apply optimistic update to cache |
| `onError` | Restore previous data from snapshot. Notify user of failure |
| `onSettled` | Invalidate queries to refetch server truth (runs on both success and error) |

### Edge Cases

- **Multiple rapid mutations** — Queue or debounce. Each `onMutate` must snapshot the current
  (possibly already optimistic) state, not the original server state
- **Network partition** — Show pending indicator after timeout. Allow user to cancel
- **Conflict** — Server rejects due to concurrent edit. Show conflict resolution UI

### Connection to Event Sourcing

Optimistic updates mirror the ES command flow: user issues a **command** (intent), UI applies an
**optimistic event** (predicted outcome), server either **confirms** (event persisted) or
**rejects** (command failed, compensating action). The rollback is analogous to a compensating
event.

---

## 6. Real-Time Data

Pushing server-side changes to the UI without polling.

### Transport Mechanisms

| Transport | Direction | Protocol | Use Case |
|---|---|---|---|
| **WebSocket** | Bidirectional | `ws://` / `wss://` | Chat, collaboration, gaming, live dashboards |
| **Server-Sent Events (SSE)** | Server → Client | HTTP | Notifications, live feeds, status updates |
| **Long Polling** | Simulated push | HTTP | Fallback when WebSocket unavailable |
| **GraphQL Subscriptions** | Server → Client | WebSocket (typically) | Real-time GraphQL data |

### WebSocket

Full-duplex, persistent connection. Low latency. Both client and server can initiate messages.
Requires connection management (reconnection, heartbeat, backoff).

**AWS API Gateway WebSocket** — Managed WebSocket with `$connect`, `$disconnect`, `$default`
routes. Lambda handles messages. DynamoDB stores connection IDs for broadcasting.

**AWS IoT WebSocket** — For high-scale fan-out (millions of connections). MQTT over WebSocket.
Topic-based pub/sub. Better for broadcast patterns than API Gateway WebSocket.

### Server-Sent Events (SSE)

One-way server-to-client stream over HTTP. Simpler than WebSocket. Auto-reconnection built into
the browser `EventSource` API. Good for: notifications, live scores, deployment status.

**Limitation** — Unidirectional. Client cannot send through the SSE channel (use regular HTTP
requests for client-to-server).

### AWS AppSync Subscriptions

GraphQL subscriptions backed by AWS. Client subscribes to a mutation type. When the mutation fires,
all subscribers receive the result. Built on WebSocket. Pairs with DynamoDB, Lambda, or
EventBridge as data sources.

### Integration with Query Cache

When a real-time event arrives, update the query cache directly:

```
// WebSocket message handler
socket.on('orderUpdated', (order) => {
  queryClient.setQueryData(['orders', order.id], order)
  // or invalidate to refetch:
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})
```

### Connection to Event-Driven Architecture

Server pushes **domain events** to the UI. The frontend becomes another consumer in the event-driven
system. `OrderShipped` event propagates: backend → message broker → WebSocket gateway → UI query
cache update. The UI reacts to domain events the same way a backend consumer does.

---

## 7. Caching Strategies

### Fetch Strategies

| Strategy | Behavior | Use Case |
|---|---|---|
| **Stale-while-revalidate** | Return cache immediately, refetch in background, swap when ready | Most server state (TanStack Query, SWR default) |
| **Cache-first** | Return cache if available, fetch only on miss | Static reference data, user preferences |
| **Network-first** | Always fetch, fall back to cache on failure | Data freshness critical (inventory, pricing) |
| **Cache-only** | Never fetch, return cache or fail | Offline mode, pre-loaded data |
| **Network-only** | Never cache, always fetch | Sensitive data (payments), one-time operations |

### Normalized vs Document Cache

| Aspect | Normalized (Apollo) | Document (TanStack Query) |
|---|---|---|
| **Storage** | Entities by type + ID. Queries reference entities | Entire response stored per query key |
| **Auto-update** | Updating entity X updates all queries referencing X | Must manually invalidate or update each query |
| **Complexity** | Higher — requires IDs, type policies, merge functions | Lower — simple key-value cache |
| **Best for** | Highly interconnected data with overlapping queries | Distinct query shapes, simpler data models |

### Cache Invalidation Strategies

| Strategy | Mechanism | When |
|---|---|---|
| **Time-based** | `staleTime`, `maxAge`, TTL | Data has known freshness window |
| **Event-based** | Invalidate on mutation success | After user writes (most common) |
| **Push-based** | WebSocket/SSE triggers cache update | Real-time requirements |
| **Manual** | User pulls to refresh, clicks refresh button | User-initiated |
| **Broadcast** | `BroadcastChannel` API syncs tabs | Multi-tab consistency |

### Service Worker Cache (Offline Support)

The Cache API inside a Service Worker intercepts network requests. Combine with the strategies
above for offline-capable apps:

```
// workbox strategy — stale-while-revalidate for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({ cacheName: 'api-cache' })
)
```

**Cache layers in order** — React Query in-memory cache → Service Worker cache → HTTP cache →
CDN cache → origin server. Each layer has its own TTL and invalidation strategy.

---

## 8. Connections to Methodologies

### CQRS (Command Query Responsibility Segregation)

| Frontend Concept | CQRS Equivalent |
|---|---|
| Query hooks (`useQuery`, `useGetOrderQuery`) | **Read model queries** — optimized projections for display |
| Mutation hooks (`useMutation`) | **Commands** — intent to change state |
| Query cache | **Local read model** — stale copy of server projection |
| Cache invalidation after mutation | **Eventual consistency** — read model catches up to write model |
| Separate query/mutation API endpoints | **Segregated read/write APIs** |

### Event Sourcing

| Frontend Concept | Event Sourcing Equivalent |
|---|---|
| Optimistic update | **Predicted event** — UI assumes command will succeed |
| Rollback on error | **Compensating event** — undo the prediction |
| Query cache as derived view | **Projection** — materialized from events |
| `useReducer` dispatch actions | **Event stream** — state derived from sequence of actions |
| Redux action log | **Event log** — ordered sequence of state-changing facts |

### DDD (Domain-Driven Design)

- **Domain events → UI updates**: Server emits `OrderShipped`, UI receives via WebSocket, updates
  display. Frontend subscribes to domain events, not implementation details.
- **Aggregate state machine → XState**: Aggregate lifecycle (Draft → Submitted → Approved →
  Fulfilled) models directly as XState statecharts. Impossible transitions are prevented by the
  machine definition.
- **Bounded Context → Micro-frontend state**: Each micro-frontend owns its state, communicating
  via events. No shared global store across context boundaries.

### Clean Architecture

State management lives in the **Interface Adapters** layer. Query hooks adapt between the external
API (Frameworks & Drivers) and the UI (Frameworks & Drivers). The domain logic in the frontend —
validation rules, state machine transitions, computed values — belongs in the **Use Cases** layer,
not in components.

```
Frameworks & Drivers:  React components, API clients
Interface Adapters:    Query hooks, state stores, form adapters
Use Cases:             Validation logic, state machines, computed state
Entities:              Shared domain types, business rules
```

### Event Modeling

The **View** pattern in Event Modeling directly maps to server state queries. Each view in the
event model becomes a query key + fetch function. The **Command** pattern maps to mutations. The
**Read Model** pattern maps to the query cache. Event Modeling's swimlane diagram is a blueprint
for which queries and mutations the frontend needs.

### BDD (Behavior-Driven Design)

State transitions become testable **Given-When-Then** scenarios:

```gherkin
Given the order form is in "editing" state
When the user clicks "Submit"
Then the form transitions to "submitting" state
And an optimistic update shows the order as "pending"

Given the server rejects the submission
Then the form transitions back to "editing" state
And the optimistic update is rolled back
And an error message is displayed
```

State machines make these scenarios exhaustively enumerable. Every state + event combination is a
potential test case.
