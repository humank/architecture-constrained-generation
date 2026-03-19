# Secure Coding Practices: Complete Reference

## OWASP Top 10 (2021)

### A01: Broken Access Control

**Description**: Application fails to enforce that users can only act within their intended permissions.
Users access unauthorized functions or data.

**Example attack**: IDOR (Insecure Direct Object Reference) — attacker modifies
`/api/orders/123` to `/api/orders/456` to access another user's order. CORS misconfiguration
allows malicious site to make authenticated requests. Missing function-level access control lets
regular user access `/admin/deleteUser`.

**Prevention**:
- Deny by default — require explicit grants
- Implement access control checks server-side (never trust client)
- Check resource ownership on every request (`order.userId == currentUser.id`)
- Disable directory listing, remove `.git` from web root
- Log access control failures, alert on repeated failures
- Rate limit API access to minimize automated attack impact
- Invalidate JWT/session on logout; use short-lived tokens
- CORS: restrict `Access-Control-Allow-Origin` to known domains (never `*` with credentials)

### A02: Cryptographic Failures

**Description**: Failures related to cryptography — or lack thereof — that expose sensitive data.
Formerly "Sensitive Data Exposure."

**Example attack**: Application stores passwords with MD5/SHA1 (unsalted). Database breach
exposes all credentials via rainbow tables. TLS not enforced, attacker performs MITM on coffee
shop WiFi. API returns credit card numbers in full instead of masked.

**Prevention**:
- Classify data by sensitivity; don't store sensitive data you don't need
- Encrypt data at rest (AES-256) and in transit (TLS 1.2+)
- Use strong algorithms: bcrypt/scrypt/Argon2 for passwords, AES-256-GCM for symmetric, RSA-2048+ or Ed25519 for asymmetric
- Never use MD5, SHA1, DES, RC4, or ECB mode
- Enforce HTTPS everywhere; use HSTS header
- Disable caching for responses containing sensitive data
- Generate keys with cryptographically secure randomness
- AWS: use KMS for key management, ACM for TLS certificates

### A03: Injection

**Description**: Untrusted data is sent to an interpreter as part of a command or query. Attacker's
hostile data tricks the interpreter into executing unintended commands or accessing unauthorized data.
XSS is now categorized here.

**Example attack**: SQL injection — `SELECT * FROM users WHERE id = '` + userInput + `'` allows
`' OR '1'='1` to dump entire table. OS command injection — `os.system("ping " + userInput)` allows
`; rm -rf /`. Stored XSS — attacker injects `<script>` tag in comment field, steals session cookies
of all viewers.

**Prevention**:
- **Parameterized queries / prepared statements** (NEVER string concatenation for SQL)
- Use ORM safely (beware raw query escape hatches)
- Input validation: allowlist expected characters, reject unexpected
- Output encoding: context-dependent (HTML, JS, URL, CSS)
- Content Security Policy (CSP) headers to mitigate XSS
- Use LDAP-encoded values for LDAP queries
- For OS commands: avoid `system()` calls; use language-native libraries instead

### A04: Insecure Design

**Description**: Fundamental design flaws — not implementation bugs. Missing or ineffective control
design. No amount of perfect implementation fixes a flawed design.

**Example attack**: Password recovery using "security questions" (knowledge-based authentication
is inherently weak). No rate limiting on credential verification allows brute force. Cinema booking
system allows bots to reserve all seats without payment.

**Prevention**:
- Threat modeling during design (STRIDE, attack trees)
- Secure design patterns: defense in depth, least privilege, fail-safe defaults
- Abuse case / misuse case stories alongside user stories
- Reference architectures and vetted component libraries
- Limit resource consumption by design (rate limits, quotas, timeouts)
- Segregate tenant data by design, not just access control
- Unit and integration test all critical authentication/authorization flows
- **Connection to BDD**: write misuse scenarios — "Given an attacker with a stolen token..."

### A05: Security Misconfiguration

**Description**: Missing or incorrect security hardening. Default credentials, unnecessary features
enabled, verbose error messages, missing security headers.

**Example attack**: Default admin/admin credentials on management console. Stack traces returned
to users revealing internal paths and library versions. Unnecessary HTTP methods (TRACE, DELETE)
enabled. Directory listing exposes source files. S3 bucket left public.

**Prevention**:
- Hardened baseline configuration, applied identically across environments
- Remove/disable unused features, frameworks, endpoints, ports
- Automated configuration verification in CI/CD
- Separate credentials per environment; never share prod credentials
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`
- Error handling: generic user-facing errors, detailed internal logging
- AWS: Config rules, Security Hub, GuardDuty for drift detection

### A06: Vulnerable and Outdated Components

**Description**: Using components (libraries, frameworks, OS) with known vulnerabilities. Not
tracking versions, not scanning, not patching.

**Example attack**: Equifax breach — unpatched Apache Struts CVE-2017-5638. Log4Shell
(CVE-2021-44228) — remote code execution via log message. Outdated jQuery with known XSS vectors.

**Prevention**:
- Maintain inventory of all components and versions (SBOM)
- Remove unused dependencies
- Monitor CVE databases, GitHub Advisory Database, NVD
- Automated scanning: `npm audit`, Snyk, Dependabot, OWASP Dependency-Check
- Patch policy: critical CVEs within 24-48 hours, high within 1 week
- Use lock files (`package-lock.json`, `yarn.lock`, `Pipfile.lock`) for reproducible builds
- AWS: Inspector for container/EC2 scanning, ECR image scanning

### A07: Identification and Authentication Failures

**Description**: Weaknesses in authentication — credential stuffing, brute force, weak passwords,
missing MFA, poor session management.

**Example attack**: Credential stuffing — attacker uses breached password lists against login endpoint.
No rate limiting allows millions of attempts. Session ID in URL gets logged/shared. Session not
invalidated after password change.

**Prevention**:
- MFA on all accounts (TOTP, WebAuthn/FIDO2 preferred over SMS)
- Never ship with default credentials
- Password policy: minimum 8 chars, check against breached password lists (HIBP API)
- Rate limit login attempts; implement account lockout with progressive delays
- Use secure session management: server-side session IDs, regenerate after login, set `Secure`, `HttpOnly`, `SameSite` cookie flags
- JWT: short expiry (15 min access, hours refresh), validate signature, check `iss`/`aud`/`exp`

### A08: Software and Data Integrity Failures

**Description**: Code and infrastructure that does not protect against integrity violations —
insecure CI/CD pipelines, unsigned updates, insecure deserialization.

**Example attack**: SolarWinds — attacker compromised build pipeline, injected malware into signed
updates distributed to 18,000 organizations. Deserialization attack — Java `ObjectInputStream`
processes crafted payload achieving RCE. Compromised npm package `event-stream` added cryptocurrency
theft code.

**Prevention**:
- Verify software integrity: digital signatures, checksums (SHA-256)
- Use trusted repositories; verify package provenance (npm provenance, Sigstore)
- CI/CD pipeline security: least privilege, signed commits, protected branches, audit logs
- Review code and config changes (no self-merge to main)
- Avoid insecure deserialization: don't deserialize untrusted data; use safe formats (JSON over Java serialization); integrity checks on serialized objects
- Subresource Integrity (SRI) for CDN-loaded scripts
- **Connection to CD**: immutable artifacts, binary promotion (build once, deploy everywhere)

### A09: Security Logging and Monitoring Failures

**Description**: Without logging and monitoring, breaches cannot be detected. Average breach
detection time: 287 days (IBM 2021). Attackers rely on lack of monitoring to persist.

**Example attack**: Attacker performs credential stuffing for weeks; no alerts triggered despite
thousands of failed logins. Data exfiltration goes unnoticed because no one monitors outbound data
volume. Audit log tampering covers attacker tracks.

**Prevention**:
- Log all: login attempts (success/fail), access control failures, input validation failures, server-side errors
- Structured logging (JSON) with correlation IDs
- Tamper-proof logs: append-only, ship to centralized system (ELK, CloudWatch, Splunk)
- Alerting on suspicious patterns: brute force, privilege escalation, unusual data access
- Incident response plan: documented, tested, rehearsed
- AWS: CloudTrail (API audit), GuardDuty (threat detection), SecurityHub (aggregation)
- Include user context (who), action (what), resource (which), timestamp (when), outcome (success/fail)

### A10: Server-Side Request Forgery (SSRF)

**Description**: Application fetches a remote resource based on user-supplied URL without
validation. Attacker makes server request internal resources.

**Example attack**: Application fetches user-provided URL for preview. Attacker supplies
`http://169.254.169.254/latest/meta-data/iam/security-credentials/` to steal AWS IAM credentials
from EC2 metadata service. Internal service enumeration via `http://internal-api:8080/admin`.

**Prevention**:
- Validate and sanitize all client-supplied URLs
- Allowlist permitted domains/IPs; deny internal/private ranges (`10.x`, `172.16.x`, `192.168.x`, `169.254.x`)
- Disable HTTP redirects or validate redirect destinations
- Don't return raw responses to client
- AWS: use IMDSv2 (requires token), VPC endpoints, network segmentation
- For webhooks: validate URL at registration and at execution time

---

## Input Validation

### Validate at System Boundaries

Every point where data enters the system is a trust boundary:
- **User input**: forms, query params, headers, cookies
- **API input**: request bodies, path params, webhook payloads
- **File uploads**: filename, content type, file content, size
- **External systems**: data from third-party APIs, message queues, databases

### Allowlist Over Denylist

- **Allowlist** (positive validation): define what IS allowed — `^[a-zA-Z0-9]{1,50}$`
- **Denylist** (negative validation): define what is NOT allowed — always incomplete, bypassable
- Allowlist catches unknown attacks; denylist only catches known patterns

### Validation Techniques

| Technique | Example |
|-----------|---------|
| Type checking | `typeof age === 'number'`, Zod schema, Pydantic model |
| Length limits | `username.length <= 50`, max file size 5MB |
| Range checks | `1 <= quantity <= 100`, date not in the past |
| Format validation | Email regex, UUID format, ISO 8601 date |
| Enum validation | `status in ['active', 'inactive', 'suspended']` |
| Business rules | Order total matches sum of line items |

### Sanitization vs Validation

1. **Validate first** — reject invalid input outright (400 Bad Request)
2. **Sanitize if needed** — transform valid-but-potentially-dangerous input (strip HTML tags, normalize Unicode)
3. Never sanitize as a substitute for validation
4. Validation = "is this data acceptable?" / Sanitization = "make this data safe"

### Connection to DDD: Value Objects

**Primitive Obsession** code smell: using `string` for email, `number` for money.

Value Objects enforce validation at domain level:

```typescript
class EmailAddress {
  constructor(private readonly value: string) {
    if (!EMAIL_REGEX.test(value)) throw new InvalidEmailError(value);
    this.value = value.toLowerCase().trim();
  }
  // Immutable, self-validating, always valid after construction
}
```

Validation happens once at creation — all downstream code receives a guaranteed-valid object.

---

## Output Encoding

### Context-Dependent Encoding

The same data requires different encoding depending on where it appears:

| Output Context | Encoding | Example |
|---------------|----------|---------|
| HTML body | HTML entity encoding | `<` becomes `&lt;` |
| HTML attribute | Attribute encoding | `"` becomes `&quot;` |
| JavaScript | JS encoding | `'` becomes `\x27` |
| URL parameter | Percent encoding | ` ` becomes `%20` |
| CSS value | CSS encoding | `(` becomes `\28` |
| SQL | Parameterized queries | Never encode manually |

### XSS Prevention

1. **Encode all output** — context-aware encoding at rendering time
2. **Content Security Policy** — defense-in-depth (see CSP section)
3. **Template engines with auto-escaping**: React JSX (escapes by default), Jinja2 (`autoescape=True`), Angular (sanitizes by default)
4. **Beware escape hatches**: React's `dangerouslySetInnerHTML`, Angular's `bypassSecurityTrust*`, Jinja2's `|safe` filter
5. **HTTPOnly cookies** — prevent JavaScript access to session cookies

### SQL Injection Prevention

```python
# NEVER — string concatenation
cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")

# ALWAYS — parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

Applies to every SQL interface: JDBC PreparedStatement, SQLAlchemy `text()` with `.bindparams()`, Prisma parameterized raw queries.

---

## Content Security Policy (CSP)

### What It Prevents

- **XSS**: blocks inline scripts and unauthorized script sources
- **Data injection**: prevents loading resources from untrusted origins
- **Clickjacking**: `frame-ancestors` directive replaces `X-Frame-Options`

### Key Directives

| Directive | Controls | Recommended |
|-----------|----------|-------------|
| `default-src` | Fallback for all resource types | `'self'` |
| `script-src` | JavaScript sources | `'self'` + nonce (no `'unsafe-inline'`) |
| `style-src` | CSS sources | `'self'` + nonce or hash |
| `img-src` | Image sources | `'self' data: https:` |
| `connect-src` | XHR/fetch/WebSocket targets | `'self'` + API domains |
| `frame-ancestors` | Who can embed this page | `'none'` or specific origins |
| `form-action` | Form submission targets | `'self'` |
| `base-uri` | Restricts `<base>` element | `'self'` |

### Nonce-Based CSP

```
Content-Security-Policy: script-src 'nonce-abc123random'
```
```html
<script nonce="abc123random">/* allowed */</script>
<script>/* blocked — no matching nonce */</script>
```

Generate a cryptographically random nonce per request. Eliminates need for `'unsafe-inline'`.

### Monitoring

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-violations
```

Deploy in report-only mode first. Monitor violations. Tighten policy iteratively. Use `report-uri`
or `report-to` directive to collect violations.

---

## Dependency Security

### Scanning Tools

| Tool | Type | Integration |
|------|------|-------------|
| `npm audit` | Built-in Node.js | CLI, CI |
| Snyk | Multi-language SCA | CI/CD, IDE, GitHub |
| Dependabot | GitHub-native | PRs for updates |
| OWASP Dependency-Check | Multi-language | CI/CD |
| AWS Inspector | Container/EC2 | ECR push trigger |

### Lock Files

- `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` — exact dependency tree
- **Commit lock files** — ensures reproducible builds across environments
- `npm ci` (not `npm install`) in CI — installs exactly what's in lock file
- Review lock file changes in PRs — unexpected changes may indicate compromise

### Supply Chain Attacks

- **Typosquatting**: `lodash` vs `1odash`, `colors` vs `co1ors`
- **Dependency confusion**: internal package name published to public registry
- **Compromised maintainer**: `event-stream` incident (2018)
- **Protestware**: maintainer injects malicious code intentionally

**Mitigations**:
- Pin exact versions in lock files
- Use private registry / scoped packages for internal code
- Enable npm provenance verification
- Review new dependencies before adding (maintenance, contributor count, known issues)
- SBOM (Software Bill of Materials) for audit trail

### SCA in CI/CD Pipeline

Place SCA scanning in the **commit stage** — fail fast on known vulnerabilities:
- Block merges with critical/high CVEs
- Allow overrides with documented risk acceptance
- Track vulnerability trends over time

---

## Secrets Management

### The Hierarchy (worst to best)

1. **Hardcoded in source code** — worst. Committed forever in git history
2. **Configuration files** — slightly better, still at risk of accidental commit
3. **Environment variables** — better, but visible in process listings, logs, error reports
4. **Secret managers** — best. Centralized, audited, rotatable, encrypted at rest

### Secret Managers

| Service | Strengths |
|---------|-----------|
| AWS Secrets Manager | Auto-rotation, RDS integration, cross-account access |
| AWS SSM Parameter Store | Free tier (standard), hierarchical, cheaper for simple secrets |
| HashiCorp Vault | Multi-cloud, dynamic secrets, leasing/revocation |
| Azure Key Vault | Azure-native, HSM-backed |
| GCP Secret Manager | GCP-native, automatic replication |

### Secret Rotation

- Automate rotation on schedule (e.g., every 90 days for DB credentials)
- AWS Secrets Manager: built-in Lambda-based rotation for RDS, Redshift, DocumentDB
- Design applications to handle credential refresh without restart
- Dual-credential pattern: old + new valid during rotation window

### Practices

- `.gitignore` all secret files (`.env`, `*.pem`, `credentials.json`)
- Pre-commit hooks: `git-secrets`, `detect-secrets`, `trufflehog`
- Scan git history for accidentally committed secrets
- **Connection to CD**: secrets injected at deployment time, not baked into artifacts at build time
- Least privilege: each service gets only the secrets it needs

---

## Security Testing in CI/CD

### Testing Types

```
┌─────────────────────────────────────────────────┐
│              Deployment Pipeline                 │
│                                                  │
│  Commit Stage          Acceptance Stage          │
│  ┌──────────────┐     ┌───────────────────┐     │
│  │ SAST          │     │ DAST               │     │
│  │ (source code) │     │ (running app)      │     │
│  │               │     │                    │     │
│  │ SCA           │     │ Penetration Tests  │     │
│  │ (dependencies)│     │ (manual/automated) │     │
│  │               │     │                    │     │
│  │ Secret scan   │     │ Fuzz Testing       │     │
│  │ (credentials) │     │ (random input)     │     │
│  │               │     │                    │     │
│  │ Container scan│     │                    │     │
│  │ (image CVEs)  │     │                    │     │
│  └──────────────┘     └───────────────────┘     │
└─────────────────────────────────────────────────┘
```

### SAST (Static Application Security Testing)

Analyzes **source code** without executing it.

| Tool | Language | Notes |
|------|----------|-------|
| SonarQube | Multi-language | Quality + security rules |
| Semgrep | Multi-language | Custom rules, fast, OSS |
| CodeGuru Reviewer | Java, Python | AWS-native, ML-based |
| ESLint security plugins | JavaScript | `eslint-plugin-security` |
| Bandit | Python | Python-specific security linter |

- Fast feedback — runs in seconds/minutes
- False positives common — tune rules, suppress known FPs with annotations
- Cannot find runtime issues (authentication bypass, SSRF in practice)

### DAST (Dynamic Application Security Testing)

Tests the **running application** from outside.

| Tool | Type |
|------|------|
| OWASP ZAP | Free, automation-friendly |
| Burp Suite | Commercial, powerful scanner |
| Nuclei | Template-based, community-driven |

- Tests what attackers actually see — real vulnerabilities
- Slower — requires deployed application
- Place in **acceptance test stage** of pipeline

### Container Scanning

- Scan base images for OS-level CVEs (Trivy, Grype, AWS ECR scanning)
- Use minimal base images (`distroless`, `alpine`)
- Rebuild images regularly to pick up base image patches
- Never run containers as root; use read-only filesystem where possible

### Pipeline Placement Summary

| Stage | Tests | Gate |
|-------|-------|------|
| Commit | SAST, SCA, secret scan, container scan | Block on critical/high |
| Acceptance | DAST, fuzz testing | Block on critical |
| Pre-production | Penetration testing (periodic) | Advisory |

---

## Secure API Practices

### Checklist

- **Authentication on every endpoint** — no "internal only" assumptions
- **Authorization at resource level** — check ownership, not just role
- **Rate limiting** — per user/IP, graduated (100/min normal, 10/min after failures)
- **Request size limits** — max body size, max upload size, max query complexity (GraphQL)
- **Input validation on every field** — schema validation (OpenAPI, JSON Schema, Zod)
- **Minimal data exposure** — return only needed fields; never expose internal IDs, stack traces, or database schemas
- **CORS configuration** — restrictive, explicit origins (never `*` with credentials)
- **Pagination** — prevent clients from requesting entire dataset
- **Idempotency** — prevent replay attacks on state-changing operations
- **Timeouts** — prevent slowloris and resource exhaustion

### API Authentication Patterns

| Pattern | Use Case | Notes |
|---------|----------|-------|
| API Key | Service-to-service, low sensitivity | Rotate regularly, restrict by IP |
| OAuth 2.0 + JWT | User-facing APIs | Short-lived access tokens (15 min) |
| mTLS | Service mesh, high security | Certificate-based mutual auth |
| HMAC signature | Webhooks | Verify payload integrity |

---

## Connections to Methodologies

### DDD: Value Objects as Validation Layer

Primitive Obsession smell leads to scattered, inconsistent validation. Value Objects centralize it:
- `Money(amount, currency)` — prevents negative amounts, enforces valid currency codes
- `PhoneNumber(value)` — validates format at construction, always valid after
- Domain layer rejects invalid data structurally, not through scattered `if` checks

### Clean Architecture: Security in the Right Layer

- **Entities/Domain**: business invariants (VOs validate, Aggregates enforce rules)
- **Use Cases**: authorization checks ("Can this user perform this action on this resource?")
- **Interface Adapters**: input sanitization, authentication middleware, rate limiting
- **Frameworks**: TLS termination, WAF, CORS headers, CSP headers
- Domain stays pure — security infrastructure does not leak into business logic

### Threat Modeling (STRIDE)

| Threat | Secure Coding Response |
|--------|----------------------|
| **S**poofing | Authentication, MFA, session management |
| **T**ampering | Input validation, integrity checks, HMAC |
| **R**epudiation | Audit logging, tamper-proof logs |
| **I**nformation Disclosure | Output encoding, minimal data exposure, encryption |
| **D**enial of Service | Rate limiting, resource quotas, timeouts |
| **E**levation of Privilege | Authorization checks, least privilege, RBAC |

### BDD: Security as Acceptance Criteria

```gherkin
Scenario: Unauthorized user cannot access admin endpoint
  Given an authenticated user with role "viewer"
  When they request "DELETE /api/users/123"
  Then the response status should be 403
  And the audit log should record an access control failure

Scenario: SQL injection attempt is rejected
  Given a search request with query "'; DROP TABLE users;--"
  When the search is executed
  Then the response status should be 400
  And no database modification should occur
```

### TDD: Security Tests First

- Write authorization test before implementing endpoint
- Write validation test before accepting new input field
- Write rate limiting test before deploying public API
- Red-green-refactor applies: failing security test first, then implement control

### Continuous Delivery: Security Gates

- Security scans are **automated gates** in the pipeline — not manual reviews
- Critical vulnerabilities **stop the line** (same as failing tests)
- Security debt tracked alongside technical debt
- Secrets injected at deployment time, never baked into build artifacts
- Immutable infrastructure: rebuild rather than patch in place

### AWS Well-Architected: Security Pillar

- **Defense in depth**: WAF + Security Groups + NACLs + application-level checks
- **Automate security**: Config rules, GuardDuty, automated remediation via Lambda
- **Least privilege**: IAM policies scoped to minimum required permissions
- **Traceability**: CloudTrail + CloudWatch + VPC Flow Logs

### Rozanski & Woods: Security Perspective

Security is an **architectural quality attribute** applied across all views:
- Functional view: authentication/authorization components
- Information view: data classification, encryption requirements
- Deployment view: network segmentation, TLS configuration
- Operational view: monitoring, incident response, log management

Secure coding is the **implementation** of security decisions made at the architectural level.

### Refactoring: Security Code Smells

| Smell | Risk | Refactoring |
|-------|------|-------------|
| Hardcoded credentials | Secret exposure | Extract to secret manager |
| String concatenation for SQL | SQL injection | Replace with parameterized query |
| Missing input validation | Injection, corruption | Introduce Value Object |
| God class handling auth | Complex, error-prone | Extract authorization service |
| Scattered permission checks | Inconsistent enforcement | Introduce authorization middleware |
| Catching and swallowing exceptions | Hidden failures | Add logging, rethrow or handle |
| Returning full entity to client | Data leakage | Introduce response DTO |
