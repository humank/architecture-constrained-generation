# Threat Modeling: Complete Reference

## What Is Threat Modeling

A systematic process to identify, quantify, and address security risks in a system design.
Performed **during the design phase**, not after implementation. Cheaper to fix threats found
early. Output: a prioritized list of threats with mitigations, feeding into architecture
decisions, security requirements, and test plans.

> "If you don't threat-model your system, an attacker will."

---

## The Four-Question Framework

Every threat modeling exercise answers these questions in order:

### 1. What Are We Building?

- Create a **system model**: components, data flows, trust boundaries
- Use Data Flow Diagrams (DFD) or adapt C4 L2/L3 diagrams
- Identify **assets** worth protecting (data, credentials, availability)
- Document **assumptions** and **external dependencies**

### 2. What Can Go Wrong?

- Apply **STRIDE** per element in the DFD
- Build **attack trees** for high-value targets
- Reference **common threat patterns** for your architecture style
- Consider both external attackers and insider threats

### 3. What Are We Going to Do About It?

- Select mitigations: **mitigate**, **transfer**, **accept**, or **avoid**
- Map mitigations to STRIDE categories (see Mitigations Mapping below)
- Document as ADRs when architecturally significant
- Write security scenarios as BDD acceptance criteria

### 4. Did We Do a Good Enough Job?

- Review coverage: every DFD element analyzed?
- Validate mitigations actually address identified threats
- Test mitigations (SAST, DAST, penetration testing)
- Schedule re-assessment on significant design changes

---

## STRIDE Model (Microsoft)

Apply per element in your Data Flow Diagram. Each category maps to a security property failure.

| Category | Failure | Target Elements | Example |
|---|---|---|---|
| **S**poofing | Authentication | External entities, processes | Forged JWT, stolen session cookie |
| **T**ampering | Integrity | Data flows, data stores, processes | Modified request body, SQL injection |
| **R**epudiation | Non-repudiation | Processes, external entities | User denies placing order, no audit trail |
| **I**nformation Disclosure | Confidentiality | Data flows, data stores | Leaked PII in logs, unencrypted traffic |
| **D**enial of Service | Availability | Processes, data stores, data flows | Resource exhaustion, amplification attack |
| **E**levation of Privilege | Authorization | Processes | IDOR, privilege escalation via admin endpoint |

### STRIDE per Element

| DFD Element | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| External Entity | x | | x | | | |
| Process | x | x | x | x | x | x |
| Data Store | | x | ? | x | x | |
| Data Flow | | x | | x | x | |

`?` = sometimes applicable, depends on context.

---

## DREAD Scoring

Quantitative risk assessment to prioritize threats. Score each dimension 1-10.

| Dimension | Question | Low (1-3) | High (8-10) |
|---|---|---|---|
| **D**amage | How bad if exploited? | Minor data exposure | Full system compromise |
| **R**eproducibility | How easy to reproduce? | Race condition, timing-dependent | Every time, deterministic |
| **E**xploitability | How much skill/tooling needed? | Custom zero-day required | Script kiddie with public exploit |
| **A**ffected Users | How many users impacted? | Single user, edge case | All users, all tenants |
| **D**iscoverability | How easy to find? | Requires source code access | Visible in public API |

**Risk Level** = average of five scores.

| Average | Priority |
|---|---|
| 7-10 | Critical — fix before release |
| 4-6 | High — fix in current iteration |
| 1-3 | Low — backlog, accept, or monitor |

> **Note**: DREAD is subjective. Use it for relative prioritization within a single threat model,
> not as absolute measurement across projects.

---

## Data Flow Diagrams (DFD) for Security

### Elements

| Symbol | Element | Description |
|---|---|---|
| Rectangle | External Entity | Person, system, or service outside your control |
| Circle | Process | Code that transforms or routes data |
| Parallel lines | Data Store | Database, file system, cache, queue |
| Arrow | Data Flow | Data moving between elements |
| Dashed line | **Trust Boundary** | Where privilege level changes |

### Trust Boundaries (Most Critical)

Trust boundaries are where security controls must exist. Examples:

- Browser ↔ Web server (internet boundary)
- Web server ↔ Application server (DMZ boundary)
- Application ↔ Database (network segment boundary)
- Microservice A ↔ Microservice B (service mesh boundary)
- Your system ↔ Third-party API (organizational boundary)

### Connection to C4 Model

- C4 **Level 2** (Container diagram) maps naturally to DFD processes and data stores
- C4 **Level 3** (Component diagram) provides granularity for STRIDE-per-element
- Add trust boundaries to C4 diagrams for security analysis

### Connection to Event Modeling

- Event Modeling blueprints show data flows explicitly: commands → events → read models
- Each swimlane crossing is a potential trust boundary
- Event store = data store requiring integrity and confidentiality analysis

---

## Attack Trees

Structured visualization of how an attacker can reach a goal.

### Structure

```
Root: Attacker's Goal (OR)
├── Attack Path A (AND)
│   ├── Step A.1 [cost: low, difficulty: low]
│   └── Step A.2 [cost: low, difficulty: medium]
├── Attack Path B (OR)
│   ├── Sub-path B.1 [cost: high, difficulty: high]
│   └── Sub-path B.2 [cost: medium, difficulty: low]
└── Attack Path C [cost: low, difficulty: low] ← prioritize defense here
```

### Node Types

- **OR**: Attacker needs any one child to succeed
- **AND**: Attacker needs all children to succeed (harder to exploit)

### Annotations

- **Cost** to attacker (time, money, resources)
- **Difficulty** (skill level required)
- **Likelihood** (based on known attack frequency)
- **Existing controls** (what already mitigates this path)

### Usage

1. Identify high-value assets from DFD
2. Build tree per asset or per attacker goal
3. Prune paths already mitigated
4. Prioritize defense on cheapest/easiest remaining paths

---

## Common Threat Patterns by Architecture

### Web Application

| Threat | STRIDE | Mitigation |
|---|---|---|
| XSS (stored, reflected, DOM) | T, I | Content Security Policy, output encoding, sanitization |
| CSRF | S | CSRF tokens, SameSite cookies |
| SQL/NoSQL Injection | T, I, E | Parameterized queries, ORM, input validation |
| Session Hijacking | S | Secure/HttpOnly cookies, session rotation, short TTL |
| Clickjacking | S | X-Frame-Options, frame-ancestors CSP |

### API (REST/GraphQL)

| Threat | STRIDE | Mitigation |
|---|---|---|
| Authentication bypass | S, E | OAuth 2.0, API keys + rotation, JWT validation |
| Excessive data exposure | I | Field-level authorization, response filtering |
| Rate limiting absence | D | API gateway throttling, per-client quotas |
| Broken object-level auth | E | IDOR checks, ownership validation per request |
| Mass assignment | T | Explicit allowlists, DTO mapping |

### Microservices

| Threat | STRIDE | Mitigation |
|---|---|---|
| Service-to-service spoofing | S | mTLS, service mesh identity (SPIFFE/SPIRE) |
| Network lateral movement | E | Network segmentation, zero-trust, service mesh policies |
| Secret sprawl | I | Centralized secret management (Vault, AWS Secrets Manager) |
| Dependency confusion | T | Private registries, lock files, signature verification |
| Cascading failure | D | Circuit breakers, bulkheads, graceful degradation |

### Event-Driven

| Threat | STRIDE | Mitigation |
|---|---|---|
| Message tampering | T | Message signing, schema validation |
| Replay attacks | S, T | Idempotency keys, event sequence validation |
| Unauthorized subscription | I, E | Topic-level ACLs, encrypted payloads |
| Poison message | D | Dead letter queues, schema validation, circuit breakers |
| Event store tampering | T, R | Append-only stores, cryptographic event chaining |

### Frontend (SPA)

| Threat | STRIDE | Mitigation |
|---|---|---|
| DOM-based XSS | T, I | Framework auto-escaping, CSP, Trusted Types |
| Token storage | I | HttpOnly cookies (not localStorage), token rotation |
| Sensitive data in client | I | Server-side rendering for sensitive data, no secrets in bundles |
| Dependency supply chain | T | SRI hashes, lock files, automated vulnerability scanning |
| Open redirect | S | Allowlist redirect URLs, validate redirect targets |

---

## Mitigations Mapping

| STRIDE | Security Property | Mitigations |
|---|---|---|
| **Spoofing** | Authentication | OAuth 2.0/OIDC, MFA, certificate-based auth (mTLS), API key rotation, session management |
| **Tampering** | Integrity | Digital signatures, checksums, immutable infrastructure, parameterized queries, input validation |
| **Repudiation** | Non-repudiation | Structured audit logging, CloudTrail/CloudWatch, append-only event stores, tamper-evident logs |
| **Information Disclosure** | Confidentiality | TLS everywhere, KMS for encryption at rest, field-level encryption, secrets management, log redaction |
| **Denial of Service** | Availability | Rate limiting, auto-scaling, WAF, CDN/edge caching, circuit breakers, resource quotas |
| **Elevation of Privilege** | Authorization | RBAC/ABAC, least privilege IAM, input validation, container sandboxing, network segmentation |

---

## Connection to Other Methodologies

### Architecture & Design

| Methodology | Connection |
|---|---|
| **R&W Security Perspective** | Threat model is the primary input; drives security architectural decisions across all viewpoints |
| **C4 Model** | L2/L3 diagrams serve as DFD basis; add trust boundaries for threat analysis |
| **ADR** | Security decisions (encryption strategy, auth approach, network segmentation) documented as ADRs |
| **Architecture Review** | Threat model is required input to security review; validates completeness |

### Domain-Driven Design

| Methodology | Connection |
|---|---|
| **Bounded Context** | Trust boundaries often align with BC boundaries; each BC may have its own security model |
| **Context Map** | Anti-Corruption Layer (ACL) includes security translation (token exchange, claim mapping) |
| **Aggregates** | Authorization checks at aggregate root; invariant enforcement = integrity protection |

### Cloud & Infrastructure

| Methodology | Connection |
|---|---|
| **AWS WAF Security Pillar** | Mitigations map directly to AWS services: IAM, KMS, WAF, GuardDuty, Security Hub |
| **Continuous Delivery** | Security testing integrated in pipeline: SAST, DAST, dependency scanning, container scanning |
| **Infrastructure as Code** | Security policies codified and version-controlled; drift detection |

### Testing & Verification

| Methodology | Connection |
|---|---|
| **BDD** | Security scenarios written as acceptance criteria: `Given unauthorized user, When accessing admin endpoint, Then return 403` |
| **Event Modeling** | Data flows visible in blueprint; each command/event boundary is a security checkpoint |
| **Contract Testing** | Security contracts (required auth headers, token formats) verified between services |
