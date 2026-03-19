# Web Performance Testing

## 1. Why Web Performance Matters

**User expectation**: Google found 53% of mobile users abandon sites taking >3 seconds to load. Performance IS user experience -- perceived speed directly determines satisfaction, engagement, and conversion.

**SEO impact**: Core Web Vitals (LCP, INP, CLS) are Google ranking signals since 2021. Poor performance = lower search visibility.

**Business impact**: Amazon found every 100ms of added latency costs 1% in revenue. Walmart saw 2% conversion increase per second of load time improvement. Performance is a business metric, not just a technical one.

**Architecture connections**:

| Framework | Connection |
|---|---|
| AWS WAF Performance Efficiency Pillar | Right resource types/sizes, monitoring, trade-off awareness |
| R&W Performance & Scalability Perspective | Systematic quality attribute: response time, throughput, scalability |
| Clean Architecture | Performance concerns (caching, CDN, compression) in Frameworks & Drivers layer |
| Continuous Delivery | Performance tests as deployment pipeline stage |

---

## 2. Core Web Vitals (Google)

Three metrics that quantify real user experience. Google uses **P75 over 28-day rolling window** from Chrome User Experience Report (CrUX).

### LCP (Largest Contentful Paint) -- Loading

**What it measures**: Time until the largest visible content element renders.

| Rating | Threshold |
|---|---|
| Good | < 2.5s |
| Needs Improvement | 2.5s -- 4.0s |
| Poor | > 4.0s |

**What triggers LCP**: `<img>`, `<svg>`, `<video>` poster image, element with `background-image`, block-level text elements.

**Optimization strategies**:
- **Eliminate render-blocking resources**: defer non-critical CSS/JS, inline critical CSS
- **Preload LCP resource**: `<link rel="preload" as="image" href="hero.webp">`
- **Priority hints**: `<img fetchpriority="high">` on LCP image
- **Image optimization**: WebP/AVIF, responsive `srcset`, appropriate sizing
- **CDN**: serve assets from edge locations close to users
- **Server response time**: TTFB < 800ms (optimize backend, use caching)

### INP (Interaction to Next Paint) -- Responsiveness

**What it measures**: Latency of ALL interactions throughout page lifecycle. Reports the worst interaction (with outlier tolerance). Replaced FID in March 2024.

| Rating | Threshold |
|---|---|
| Good | < 200ms |
| Needs Improvement | 200ms -- 500ms |
| Poor | > 500ms |

**Full interaction lifecycle**:
```
Input Delay → Processing Time → Presentation Delay
(queued tasks)   (event handlers)   (render, paint)
```

**Why INP replaced FID**: FID only measured input delay of the FIRST interaction. INP measures the complete lifecycle of ALL interactions -- far more representative.

**Optimization strategies**:
- **Break long tasks**: tasks >50ms block the main thread; split with `scheduler.yield()` or `setTimeout`
- **Yield to main thread**: `await scheduler.yield()` between processing chunks
- **Web Workers**: offload heavy computation off the main thread
- **Minimize DOM size**: large DOMs increase rendering cost
- **Debounce/throttle**: reduce handler invocations on rapid interactions
- **`requestAnimationFrame`**: batch visual updates

### CLS (Cumulative Layout Shift) -- Visual Stability

**What it measures**: Sum of unexpected layout shift scores during page lifecycle (using session windows with 1s gap, 5s max).

| Rating | Threshold |
|---|---|
| Good | < 0.1 |
| Needs Improvement | 0.1 -- 0.25 |
| Poor | > 0.25 |

**Common causes**:
- Images/iframes without explicit `width`/`height` or `aspect-ratio`
- Dynamically injected content (ads, banners, cookie notices)
- Web fonts causing FOIT/FOUT
- Late-loading CSS applying new styles

**Optimization strategies**:
- **Always set dimensions**: `<img width="800" height="600">` or CSS `aspect-ratio`
- **`font-display: swap`** or `optional` to control font rendering behavior
- **Content placeholders**: reserve space for async content (skeleton screens)
- **`contain-intrinsic-size`**: hint size for `content-visibility: auto` elements
- **Avoid inserting content above existing content** unless in response to user interaction

---

## 3. Performance Budgets

**What**: Maximum allowed values for performance metrics. Enforced as hard limits in CI/CD.

### Budget Types

| Type | Example | Enforcement |
|---|---|---|
| **Milestone** (timing) | LCP < 2.5s, TTI < 3.8s | Lighthouse CI assertions |
| **Quantity** (size) | JS < 300KB, CSS < 50KB, images < 500KB | bundlesize, size-limit |
| **Rule** (score) | Lighthouse Performance > 90, Accessibility > 95 | Lighthouse CI |

### Setting Budgets

1. **Baseline**: measure current state across key pages
2. **Competitor analysis**: target 20% faster than top competitor
3. **Allocate per resource type**: total JS budget split across first-party, third-party, framework
4. **Progressive tightening**: ratchet budgets as you optimize

### Enforcement

```yaml
# lighthouserc.js
ci: {
  assert: {
    assertions: {
      'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      'interactive': ['error', { maxNumericValue: 3800 }],
      'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
    }
  }
}
```

**Fail the build** if any budget is exceeded. Performance budgets are non-negotiable gates, like test failures.

---

## 4. Lab Testing (Synthetic)

Controlled, repeatable measurements in a consistent environment. Good for regression detection and debugging.

### Lighthouse

Google's comprehensive audit tool covering Performance, Accessibility, Best Practices, SEO.

**Run modes**: Chrome DevTools, CLI (`npx lighthouse`), Node API, PageSpeed Insights.

**Lighthouse CI** -- run in pipeline:

```bash
# Install
npm install -g @lhci/cli

# Collect (runs Lighthouse N times, takes median)
lhci collect --url=https://example.com --numberOfRuns=3

# Assert (fail if budgets exceeded)
lhci assert --preset=lighthouse:recommended

# Upload (store results for comparison)
lhci upload --target=temporary-public-storage
```

**GitHub Actions integration**:

```yaml
- uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      https://example.com/
      https://example.com/products
    budgetPath: ./budget.json
    uploadArtifacts: true
```

**Key configuration**:
- `numberOfRuns: 3-5` for stable median
- Fixed network throttling (simulated or DevTools)
- Fixed CPU throttling (4x slowdown)
- Assertions with `error` (fail) or `warn` (notify) levels

### WebPageTest

**Strengths**: detailed waterfall charts, filmstrip view, multi-step transactions, real browsers from 40+ global locations.

- **Connection profiles**: Cable, 3G, 4G, custom
- **Comparison mode**: side-by-side before/after analysis
- **API access**: `webpagetest.org/api` for CI integration
- **Private instances**: WebPageTest server for internal testing

### Chrome DevTools Performance Panel

- **Flame charts**: identify long tasks, layout thrashing, forced reflows
- **Long tasks** (>50ms): highlighted with red corners
- **Layout shifts**: visible in Experience row
- **Network waterfall**: request timing breakdown
- **Coverage tab**: identify unused CSS/JS

### Consistency Requirements

- Run in Docker containers for reproducible environment
- Fixed viewport: 1350x940 (desktop), 360x640 (mobile)
- Consistent network: 4G simulation (150ms RTT, 1.6Mbps down, 0.75Mbps up)
- CPU throttling: 4x slowdown for mobile simulation
- Disable variable factors: browser extensions, variable content (ads)

---

## 5. Field Testing (Real User Monitoring -- RUM)

Measures actual user experience in production. Captures the diversity of devices, networks, and behaviors.

### web-vitals Library (Google)

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(metric => sendToAnalytics('LCP', metric));
onINP(metric => sendToAnalytics('INP', metric));
onCLS(metric => sendToAnalytics('CLS', metric));
```

- Lightweight (~1.5KB gzipped)
- Reports the same metrics Chrome reports to CrUX
- Attribution build (`web-vitals/attribution`) for debugging root causes

### AWS CloudWatch RUM

- JavaScript snippet embedded in pages
- Reports performance, errors, HTTP calls, navigation
- Integrated with CloudWatch dashboards, X-Ray traces, CloudWatch Evidently (A/B)
- Custom events and attributes for business-specific dimensions

### Google Search Console

- Core Web Vitals report from real Chrome users (CrUX data)
- Groups URLs by status: Good, Needs Improvement, Poor
- Shows trends over time
- Only covers pages with sufficient traffic

### Analysis Practices

| Practice | Why |
|---|---|
| Use **P75** (not averages) | Averages hide poor experiences; P75 represents what most users experience |
| **Segment** by device type | Mobile vs desktop have vastly different profiles |
| **Segment** by connection | 4G vs 3G vs WiFi changes everything |
| **Segment** by geography | Users far from servers/CDN experience higher latency |
| **Segment** by page type | Homepage vs product page vs checkout have different profiles |
| Track **over time** | Detect regressions from deployments |

---

## 6. Load Testing

Validates system behavior under expected and extreme traffic. Answers: "How many concurrent users can we handle before degradation?"

### Tools Comparison

| Tool | Language | Strengths | Best For |
|---|---|---|---|
| **k6** (Grafana) | JavaScript | CLI-first, dev-friendly, built-in metrics, extensions | API load testing, CI integration |
| **Artillery** | YAML + JS | Declarative scenarios, protocol support | API, WebSocket, Socket.io |
| **Locust** | Python | Distributed, real-time web UI, code-driven | Python teams, complex user flows |

### Test Types

| Type | Purpose | Traffic Pattern |
|---|---|---|
| **Smoke** | Verify system works under minimal load | 1-2 VUs, short duration |
| **Load** | Validate under expected traffic | Ramp to expected VUs, sustain |
| **Stress** | Find breaking point | Ramp beyond expected capacity |
| **Soak** | Detect memory leaks, resource exhaustion | Moderate load, long duration (hours) |
| **Spike** | Validate auto-scaling and recovery | Sudden traffic burst, then drop |

### k6 Example

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // ramp up
    { duration: '5m', target: 100 },  // sustain
    { duration: '2m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(Math.random() * 3 + 1);  // think time: 1-4 seconds
}
```

### Key Practices

- **Think time**: simulate real user pauses between actions (`sleep(1-4s)`)
- **Ramp-up**: gradually increase load to avoid thundering herd
- **Realistic data**: use varied inputs, not single repeated request
- **Monitor server-side**: correlate client metrics with CPU, memory, DB connections
- **Baseline comparison**: fail if P95 latency regresses >10% from baseline
- **Connection to Reliability Pillar**: load tests validate auto-scaling policies, circuit breakers, and graceful degradation

---

## 7. Frontend Performance Patterns

### Code Splitting and Lazy Loading

```javascript
// Route-based splitting (React)
const ProductPage = React.lazy(() => import('./ProductPage'));

// Intersection Observer for component lazy loading
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) loadComponent(entry.target);
  });
});
```

- Split by route (each page loads only its code)
- Split by component (below-fold components load on scroll)
- Split by interaction (modal code loads on button click)
- Target: initial JS < 150KB (compressed)

### Image Optimization

| Technique | Implementation |
|---|---|
| Modern formats | WebP (30% smaller than JPEG), AVIF (50% smaller) |
| Responsive images | `<img srcset="sm.webp 400w, md.webp 800w" sizes="(max-width: 600px) 400px, 800px">` |
| Lazy loading | `<img loading="lazy">` for below-fold images |
| LCP image priority | `<img fetchpriority="high">` for hero image |
| Dimensions | Always set `width` and `height` to prevent CLS |

### Font Optimization

- **`font-display: swap`**: show fallback font immediately, swap when custom font loads
- **`font-display: optional`**: only use custom font if already cached (no layout shift)
- **Subsetting**: include only needed characters (Latin vs full Unicode)
- **Preload**: `<link rel="preload" href="font.woff2" as="font" crossorigin>`
- **Variable fonts**: single file replaces multiple weights/styles

### Caching Strategies

| Layer | Strategy | TTL |
|---|---|---|
| **CDN** (CloudFront) | Cache static assets at edge | Long (1 year for hashed assets) |
| **Browser** | `Cache-Control: max-age=31536000, immutable` for versioned assets | Long |
| **Service Worker** | Stale-while-revalidate for API; cache-first for static | Varies |
| **API** | ElastiCache/DAX for database query results | Short (seconds-minutes) |

### Bundle Analysis

- **webpack-bundle-analyzer**: treemap visualization of bundle contents
- **source-map-explorer**: analyze what code contributes to bundle size
- **bundlephobia.com**: check package size before adding dependency
- **Import Cost** (VS Code extension): inline display of import sizes
- Track bundle size per PR with `size-limit` or `bundlesize`

### Tree Shaking and Dead Code

- Use ES modules (`import`/`export`) -- not CommonJS (`require`)
- Mark packages as side-effect-free: `"sideEffects": false` in package.json
- Avoid barrel files (`index.ts` re-exporting everything) -- defeats tree shaking
- Use `/*#__PURE__*/` annotations for function calls that bundlers can safely remove

---

## 8. CI/CD Integration

### Pipeline Stages for Performance

```
Commit Stage          → Acceptance Stage       → Performance Stage      → Production
- Bundle size check    - Lighthouse CI           - Load tests (k6)       - RUM monitoring
- size-limit           - Performance budget      - Soak tests            - CrUX tracking
- Import cost          - Visual regression       - Stress tests          - Alerting
```

### Lighthouse CI in Pipeline

```yaml
# GitHub Actions
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v12
        with:
          urls: https://staging.example.com/
          budgetPath: ./performance-budget.json
          temporaryPublicStorage: true
```

### Bundle Size Tracking

```yaml
# package.json with size-limit
{
  "size-limit": [
    { "path": "dist/index.js", "limit": "150 KB" },
    { "path": "dist/vendor.js", "limit": "200 KB" }
  ]
}
```

PR comments show size diff: `+2.3 KB (+1.5%)` -- reviewable like code changes.

### Regression Detection

- Store Lighthouse results in persistent server (LHCI Server or BigQuery)
- Compare each commit against baseline (main branch median)
- Alert thresholds: >5% regression in any Core Web Vital
- Automated PR comment with performance comparison
- Load test results: fail if P95 latency regresses >10%

### Performance Gates (Non-Negotiable)

| Gate | Stage | Action on Failure |
|---|---|---|
| Bundle size within budget | Commit | Block merge |
| Lighthouse score > threshold | Acceptance | Block deploy |
| Core Web Vitals within budget | Acceptance | Block deploy |
| P95 latency within SLA | Performance | Block promote to prod |
| Error rate < threshold | Performance | Block promote to prod |

---

## 9. AWS-Specific Performance

### Static Asset Delivery

| Service | Use Case |
|---|---|
| **CloudFront** | CDN for static assets, API caching, TLS termination at edge |
| **S3** | Origin for static hosting (website, SPA assets) |
| **Lambda@Edge** | Request/response transformation at edge (A/B testing, redirects, auth) |
| **CloudFront Functions** | Lightweight edge compute (header manipulation, URL rewrites) -- cheaper, faster than Lambda@Edge |

### API and Data Caching

| Service | Use Case | Latency |
|---|---|---|
| **ElastiCache (Redis)** | Session store, API response cache, leaderboards | < 1ms |
| **DAX** | DynamoDB accelerator, read-heavy workloads | Microseconds |
| **API Gateway caching** | Cache API responses at gateway level | Configurable TTL |
| **CloudFront** | Cache API responses at edge (for cacheable GETs) | Varies by POP |

### Global Performance

- **Global Accelerator**: anycast IPs route to nearest AWS region; TCP/UDP optimization
- **Route 53 latency-based routing**: DNS resolution to lowest-latency region
- **Multi-region active-active**: DynamoDB Global Tables + regional compute
- **CloudFront Origin Shield**: reduce origin load with additional caching layer

### Right-Sizing

- **Compute Optimizer**: ML-based recommendations for EC2, Lambda, ECS, EBS
- **Lambda Power Tuning**: find optimal memory/cost configuration
- **Auto Scaling**: scale compute based on actual demand (validates with load tests)
- **Graviton instances**: better price-performance for compute workloads

---

## 10. Connection to Architecture

### R&W Performance & Scalability Perspective

Performance is a **quality attribute** addressed systematically:

- **Response time**: user-facing latency (measured by Core Web Vitals)
- **Throughput**: requests/second the system handles (measured by load tests)
- **Scalability**: ability to maintain performance as load increases
- **Resource utilization**: efficiency of compute, memory, network usage
- **Activities**: capture requirements, create models, analyze, test, resolve trade-offs

### AWS WAF Performance Efficiency Pillar

Five design principles: democratize advanced tech, go global in minutes, use serverless, experiment more often, consider mechanical sympathy.

Best practice areas:
- **Architecture selection**: right compute, storage, database, network for workload
- **Compute and hardware**: instances, containers, functions -- match to workload pattern
- **Data management**: right data store (relational, key-value, document, graph, time-series)
- **Networking**: content delivery, network protocols, resource placement
- **Process and culture**: performance testing, load testing, benchmarking as standard practice

### Clean Architecture Mapping

Performance optimizations belong in **Frameworks & Drivers** (outermost ring):

| Layer | Performance Concern |
|---|---|
| Frameworks & Drivers | CDN, caching, compression, connection pooling, HTTP/2 |
| Interface Adapters | Response serialization format, pagination, field selection |
| Application (Use Cases) | Query optimization, batch processing, async processing |
| Entities | Domain logic should be performance-neutral (optimize outer layers first) |

The Dependency Rule ensures performance optimizations don't leak into business logic.

### Continuous Delivery Integration

Performance testing maps to the deployment pipeline:

| Pipeline Stage | Performance Activity |
|---|---|
| Commit | Bundle size check, static analysis for performance anti-patterns |
| Acceptance | Lighthouse CI, performance budgets, Core Web Vitals assertions |
| Performance | Load tests, stress tests, soak tests |
| Production | RUM, CrUX monitoring, alerting on degradation |

### Core Web Vitals as NFRs

Trace from requirements through architecture to verification:

```
Requirements Intake → "LCP < 2.5s on 4G mobile"
  ↓
Architecture Decision → CDN, image optimization, critical CSS inlining
  ↓
Implementation → Preload hints, responsive images, code splitting
  ↓
Verification → Lighthouse CI in pipeline + RUM in production
  ↓
Monitoring → CloudWatch RUM dashboard, P75 alerting
```

Performance requirements are **non-functional requirements** that must be:
- Quantified (not "fast" but "LCP < 2.5s at P75")
- Measured continuously (not once, but every deploy)
- Enforced automatically (pipeline gates, not manual review)
- Monitored in production (lab != field; both are needed)
