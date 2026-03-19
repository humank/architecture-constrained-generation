# Authentication and Authorization Patterns

## Authentication vs Authorization

| Aspect | Authentication (AuthN) | Authorization (AuthZ) |
|--------|----------------------|---------------------|
| Question | **Who are you?** | **What can you do?** |
| Mechanism | Credentials, tokens, certificates | Policies, roles, permissions |
| When | Before authorization | After authentication |
| STRIDE threat | Spoofing | Elevation of Privilege |
| Failure response | 401 Unauthorized | 403 Forbidden |

AuthN establishes identity. AuthZ enforces access control. They are separate concerns — always implement them independently.

---

## OAuth 2.0

An authorization framework (RFC 6749) that lets applications obtain limited access to user accounts on third-party services. OAuth 2.0 delegates authentication to the service hosting the user account and authorizes third-party applications to access it.

### Roles

- **Resource Owner**: The user who authorizes access
- **Client**: The application requesting access
- **Authorization Server**: Issues tokens after authenticating the resource owner
- **Resource Server**: Hosts protected resources, accepts access tokens

### Grant Types

#### Authorization Code + PKCE (Most Common)

For web apps, mobile apps, SPAs. The **recommended grant** for almost all cases.

```
Client → Auth Server: GET /authorize?response_type=code&code_challenge=...
User authenticates and consents
Auth Server → Client: redirect with ?code=abc123
Client → Auth Server: POST /token (code + code_verifier)
Auth Server → Client: { access_token, refresh_token, id_token }
```

**PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception. The client generates a random `code_verifier`, sends its SHA-256 hash as `code_challenge` in the authorization request, then proves possession by sending the original `code_verifier` in the token request. Required for public clients (SPAs, mobile), recommended for all clients.

#### Client Credentials

For **service-to-service** communication. No user involved.

```
Service → Auth Server: POST /token (client_id + client_secret, grant_type=client_credentials)
Auth Server → Service: { access_token }
```

No refresh token issued — the client can request a new access token at any time using its credentials.

#### Device Code

For input-constrained devices (smart TVs, CLI tools, IoT).

```
Device → Auth Server: POST /device/code
Auth Server → Device: { device_code, user_code, verification_uri }
Device displays: "Go to https://example.com/device and enter code: ABCD-1234"
Device polls: POST /token (device_code, grant_type=urn:ietf:params:oauth:grant-type:device_code)
User authenticates on separate device
Auth Server → Device: { access_token, refresh_token }
```

#### Refresh Token

Exchange a long-lived refresh token for a new short-lived access token without user interaction.

```
Client → Auth Server: POST /token (refresh_token, grant_type=refresh_token)
Auth Server → Client: { access_token, refresh_token (rotated) }
```

**Refresh token rotation**: Issue a new refresh token with each use and invalidate the old one. Detects token theft — if a stolen token is used after the legitimate client already rotated, both are invalidated.

### Tokens

| Token | Lifetime | Purpose | Storage |
|-------|----------|---------|---------|
| Access Token | Short (5-60 min) | Authorize API requests | Memory or HttpOnly cookie |
| Refresh Token | Long (hours-days) | Obtain new access tokens | HttpOnly cookie, secure storage |

### Scopes

Scopes define permission boundaries. The client requests scopes, the user consents, the token is issued with granted scopes.

```
scope=openid profile email read:documents write:documents
```

- Use **least privilege**: request only needed scopes
- Define **granular scopes**: `read:orders` vs `admin:orders`
- Resource server validates scope claims on each request

---

## OpenID Connect (OIDC)

An **identity layer on top of OAuth 2.0**. OAuth 2.0 alone provides authorization (access to resources) but not authentication (who the user is). OIDC adds standardized identity.

### What OIDC Adds

- **ID Token**: JWT containing user identity claims
- **UserInfo Endpoint**: API for fetching additional user profile data
- **Standard Claims**: Interoperable user attributes
- **Discovery**: Machine-readable provider configuration

### ID Token

A JWT issued alongside the access token. Contains claims about the authentication event and user identity.

```json
{
  "iss": "https://auth.example.com",
  "sub": "user-uuid-123",
  "aud": "my-client-id",
  "exp": 1700000000,
  "iat": 1699999000,
  "nonce": "random-nonce-value",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "email_verified": true
}
```

**The ID Token is for the client application** — it proves who authenticated. **The access token is for the resource server** — it authorizes API calls. Never send the ID token to an API.

### Standard Claims

| Claim | Description |
|-------|-------------|
| `sub` | Subject identifier (unique, stable user ID) |
| `name` | Full name |
| `email` | Email address |
| `email_verified` | Whether email is verified |
| `picture` | Profile picture URL |
| `locale` | Locale (e.g., `en-US`) |
| `updated_at` | Last profile update timestamp |

### UserInfo Endpoint

```
GET /userinfo
Authorization: Bearer <access_token>

Response: { "sub": "user-uuid-123", "name": "Jane Doe", ... }
```

Returns claims about the authenticated user. Requires `openid` scope plus any profile-related scopes (`profile`, `email`, `address`, `phone`).

### Discovery Document

Available at `/.well-known/openid-configuration`. Enables automatic client configuration.

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "userinfo_endpoint": "https://auth.example.com/userinfo",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "scopes_supported": ["openid", "profile", "email"],
  "response_types_supported": ["code"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
```

---

## JWT (JSON Web Tokens)

### Structure

```
header.payload.signature
```

```
eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature
```

- **Header**: Algorithm and token type (`{"alg": "RS256", "typ": "JWT"}`)
- **Payload**: Claims (data)
- **Signature**: Cryptographic verification of header + payload

### Signing Algorithms

| Algorithm | Type | Key | Use Case |
|-----------|------|-----|----------|
| HS256 | Symmetric | Shared secret | Single service (issuer = verifier) |
| RS256 | Asymmetric | RSA key pair | **Preferred.** Distributed systems (many verifiers) |
| ES256 | Asymmetric | ECDSA key pair | Smaller keys, same security as RS256 |

**Always prefer RS256/ES256** — the authorization server signs with the private key, resource servers verify with the public key (published via JWKS endpoint). No secret distribution needed.

### Standard Claims

| Claim | Name | Purpose |
|-------|------|---------|
| `iss` | Issuer | Who issued the token |
| `sub` | Subject | Who the token is about |
| `aud` | Audience | Who the token is intended for |
| `exp` | Expiration | When the token expires (Unix timestamp) |
| `iat` | Issued At | When the token was issued |
| `nbf` | Not Before | Token is not valid before this time |
| `jti` | JWT ID | Unique token identifier (for revocation) |

### Validation Checklist

1. **Verify signature** against the issuer's public key (JWKS endpoint)
2. **Check `exp`** — reject expired tokens (allow small clock skew, ~30s)
3. **Check `iss`** — must match expected issuer
4. **Check `aud`** — must include this service's identifier
5. **Check `nbf`** if present
6. **Check required claims** (scopes, roles, custom claims)
7. **Never decode without verifying signature** (`alg: none` attack)

### Security Concerns

- **Do not store sensitive data in payload** — JWTs are base64-encoded, not encrypted (unless using JWE)
- **Use short expiry** (5-15 min for access tokens) — JWTs cannot be revoked once issued
- **Storage in browsers**:
  - **HttpOnly cookies**: Protected from XSS, vulnerable to CSRF (mitigate with SameSite + CSRF token)
  - **In-memory (JavaScript variable)**: Protected from CSRF, lost on page refresh
  - **Never localStorage/sessionStorage**: Accessible to any JavaScript, vulnerable to XSS
- **Revocation**: Maintain a deny-list of `jti` values for critical revocations, or use short-lived tokens with refresh token rotation
- **Key rotation**: Rotate signing keys regularly, publish both old and new keys in JWKS during transition

---

## Session Management

### Server-Side Sessions vs Stateless Tokens

| Aspect | Server-Side Sessions | Stateless Tokens (JWT) |
|--------|---------------------|----------------------|
| State | Session store (Redis, DB) | Encoded in token |
| Revocation | Immediate (delete session) | Difficult (wait for expiry) |
| Scalability | Requires shared store | No shared state needed |
| Size | Small session ID | Larger token payload |
| Best for | Traditional web apps | APIs, microservices, SPAs |

### Session Fixation Prevention

An attacker sets a known session ID before the victim authenticates, then hijacks the authenticated session.

**Mitigation**: Always regenerate the session ID after successful authentication. Invalidate the old session.

### Session Timeout

- **Idle timeout**: Expire session after inactivity (e.g., 15-30 min). Reset on each request.
- **Absolute timeout**: Expire session regardless of activity (e.g., 8-24 hours). Forces re-authentication.
- **Combine both**: Idle timeout for inactive users, absolute timeout as a ceiling.

### Secure Cookie Attributes

| Attribute | Purpose | Setting |
|-----------|---------|---------|
| `HttpOnly` | Prevent JavaScript access (XSS protection) | Always set |
| `Secure` | Only send over HTTPS | Always set in production |
| `SameSite` | CSRF protection | `Strict` or `Lax` |
| `Domain` | Scope the cookie | Narrowest possible domain |
| `Path` | Scope the cookie | Narrowest possible path |
| `Max-Age` / `Expires` | Cookie lifetime | Match session timeout |

```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1800
```

---

## Authorization Patterns

### RBAC (Role-Based Access Control)

**User → Role → Permissions.** Simple, widely understood.

```
User "jane" → Role "editor" → Permissions ["create:article", "edit:article", "publish:article"]
User "bob"  → Role "viewer" → Permissions ["read:article"]
```

- **Pros**: Simple to implement, easy to audit, maps well to organizational structure
- **Cons**: Role explosion in complex systems, coarse-grained, no context awareness
- **Best for**: Enterprise apps with clear organizational hierarchies, admin panels

**Hierarchical RBAC**: Roles inherit from parent roles (`admin` inherits all `editor` permissions).

### ABAC (Attribute-Based Access Control)

**Policy based on attributes** of user, resource, action, and environment. More flexible, more complex.

```
PERMIT if:
  user.department == resource.department AND
  user.clearance_level >= resource.classification AND
  environment.time_of_day BETWEEN "09:00" AND "17:00" AND
  action == "read"
```

- **Pros**: Fine-grained, context-aware, fewer policies than roles, dynamic
- **Cons**: Complex to implement and debug, harder to audit, performance considerations
- **Best for**: Healthcare (HIPAA), government, complex business rules

### ReBAC (Relationship-Based Access Control)

**Access based on relationships between entities.** Inspired by Google Zanzibar.

```
document:readme#viewer@user:jane          // jane can view readme
document:readme#editor@group:engineering  // engineering group can edit readme
folder:docs#parent@document:readme        // readme is in docs folder (inheritance)
```

Models access as a graph — check if a path exists between user and resource.

- **Pros**: Natural for social/sharing models, handles inheritance elegantly, consistent
- **Cons**: Requires graph infrastructure, complex to reason about, eventual consistency
- **Best for**: Google Drive-like sharing, social networks, multi-tenant SaaS
- **Implementations**: Google Zanzibar, SpiceDB, Authzed, OpenFGA

### Policy-Based Authorization

Centralized policy engine evaluates access decisions. Decouples policy from application code.

**OPA (Open Policy Agent) with Rego**:

```rego
package authz

default allow = false

allow {
    input.method == "GET"
    input.path == ["api", "public"]
}

allow {
    input.method == "GET"
    input.user.roles[_] == "admin"
}
```

**Cedar (AWS Verified Permissions)**:

```cedar
permit(
    principal in Role::"editor",
    action in [Action::"edit", Action::"publish"],
    resource in Folder::"drafts"
) when {
    principal.department == resource.department
};
```

### Selection Guide

| Criteria | RBAC | ABAC | ReBAC |
|----------|------|------|-------|
| Complexity | Low | High | Medium-High |
| Granularity | Coarse | Fine | Fine |
| Context-aware | No | Yes | Partial |
| Sharing models | Poor | Good | Excellent |
| Audit | Easy | Hard | Medium |
| Use when | Simple roles suffice | Complex business rules | Social/sharing features |

**Start with RBAC.** Add ABAC attributes when role explosion occurs. Use ReBAC when sharing and relationships are core to the domain.

---

## Microservice Authentication

### API Gateway Pattern

The API Gateway handles external authentication, downstream services trust verified identity.

```
Client → API Gateway (validate token, rate limit, route)
         → Service A (receives verified identity in header/JWT)
         → Service B
```

- Gateway validates the access token (signature, expiry, audience)
- Gateway injects identity context (user ID, roles, scopes) into downstream headers
- Internal services trust the gateway — **enforce network-level isolation** so services cannot be reached directly

### Service-to-Service Authentication

| Method | Description | Use Case |
|--------|-------------|----------|
| **mTLS** | Both sides present certificates | Zero-trust, service mesh |
| **JWT Propagation** | Forward the user's JWT | Maintain user context downstream |
| **Client Credentials** | Service obtains its own token | Service acting on its own behalf |
| **Token Exchange** | Swap user token for downstream-scoped token | Least-privilege per service |
| **Service Mesh** | Istio/Linkerd handles mTLS transparently | Platform-level security |

### JWT Propagation vs Token Exchange

- **Propagation**: Forward the original JWT. Simple, but the downstream service gets all the original scopes.
- **Token Exchange (RFC 8693)**: The service exchanges the user's token for a new token scoped for the downstream service. Implements least privilege.

```
Service A → Auth Server: POST /token
  grant_type=urn:ietf:params:oauth:grant-type:token-exchange
  subject_token=<user's token>
  audience=service-b
Auth Server → Service A: { access_token (scoped for Service B) }
Service A → Service B: Authorization: Bearer <new token>
```

### AWS-Specific Patterns

- **Cognito + API Gateway**: API Gateway validates Cognito JWT automatically
- **Lambda Authorizer**: Custom authorization logic in a Lambda function (for non-Cognito tokens or complex rules)
- **IAM Authorization**: For internal AWS service-to-service (uses SigV4 signing)
- **VPC Link**: Private API Gateway to internal services

---

## Multi-Factor Authentication (MFA)

### Factor Categories

| Factor | Category | Examples |
|--------|----------|---------|
| Something you **know** | Knowledge | Password, PIN, security questions |
| Something you **have** | Possession | TOTP app, hardware key, phone (SMS) |
| Something you **are** | Inherence | Fingerprint, face, iris |

True MFA requires factors from **different categories**. Password + security question is NOT MFA (both are knowledge).

### TOTP (Time-based One-Time Password)

RFC 6238. Shared secret + current time generates a 6-digit code every 30 seconds.

- **Setup**: Server generates secret, encodes as QR code (`otpauth://totp/...`), user scans with authenticator app
- **Verification**: Server computes expected code for current time window (and adjacent windows for clock skew)
- **Recovery**: Provide one-time backup codes at setup time
- **Pros**: Works offline, widely supported, no vendor lock-in
- **Cons**: Phishable (user can be tricked into entering code on fake site), secret can be stolen

### WebAuthn / FIDO2

W3C standard for **passwordless, phishing-resistant** authentication using public key cryptography.

```
Registration:
  Server → Browser: challenge
  Browser → Authenticator: create credential (biometric/PIN verification)
  Authenticator → Browser → Server: public key + signed challenge
  Server stores public key

Authentication:
  Server → Browser: challenge
  Browser → Authenticator: sign challenge (biometric/PIN verification)
  Authenticator → Browser → Server: signed challenge
  Server verifies signature with stored public key
```

- **Phishing-resistant**: Credential is bound to the origin (domain) — cannot be used on a fake site
- **Authenticators**: Platform (Touch ID, Windows Hello) or roaming (YubiKey, Titan Key)
- **Passkeys**: Discoverable credentials synced across devices (iCloud Keychain, Google Password Manager)
- **Preferred over TOTP** for security-critical applications

### AWS Cognito MFA Configuration

- Supports TOTP and SMS (SMS discouraged — SIM swapping, interception)
- **Adaptive authentication**: Risk-based MFA (new device, new IP triggers MFA)
- Configuration: `MfaConfiguration: ON | OFF | OPTIONAL`
- Can require MFA for specific user groups or risk levels

---

## AWS Services for Auth

### Cognito User Pools (Authentication)

Managed user directory and authentication service.

- Sign-up/sign-in with username/password, social providers (Google, Facebook, Apple), SAML, OIDC
- Issues JWTs: ID token, access token, refresh token
- Built-in hosted UI or custom UI with Cognito API
- User attributes, groups, custom claims via pre/post-authentication Lambda triggers
- **Use for**: Application-level user authentication

### Cognito Identity Pools (Federated Identity)

Exchanges identity provider tokens for temporary **AWS credentials**.

- Accepts tokens from Cognito User Pools, social providers, SAML, OIDC
- Maps to IAM roles (authenticated vs unauthenticated)
- **Use for**: Granting end users direct access to AWS resources (S3, DynamoDB)

```
User authenticates → Cognito User Pool (JWT)
JWT → Cognito Identity Pool → Temporary AWS credentials (STS)
Credentials → Direct access to S3, DynamoDB, etc.
```

### IAM (Service-Level Authorization)

- **IAM Roles**: For services, Lambda functions, EC2 instances — never hardcode credentials
- **IAM Policies**: JSON documents defining allow/deny for AWS API actions on resources
- **Least privilege**: Start with no permissions, add only what is needed
- **Service Control Policies (SCPs)**: Organization-level guardrails

### AWS Verified Permissions

Managed authorization service using **Cedar** policy language.

- Centralized policy store for application-level authorization
- Supports RBAC, ABAC, and ReBAC patterns in Cedar
- Integrates with Cognito — evaluates policies against JWT claims
- Schema validation for policies
- **Use for**: Complex application authorization that goes beyond simple role checks

### Secrets Manager / Parameter Store

| Service | Use Case | Features |
|---------|----------|----------|
| Secrets Manager | Database passwords, API keys, tokens | Automatic rotation, cross-account access |
| Parameter Store | Configuration values, non-rotating secrets | Free tier, hierarchical, SecureString type |

**Never store credentials in code, environment variables (if avoidable), or config files.** Use IAM roles for AWS-to-AWS. Use Secrets Manager for third-party credentials.

---

## Connection to Methodologies

### DDD

- **Auth as Generic Subdomain**: Authentication/authorization is a solved problem. Use an existing solution (Cognito, Auth0, Keycloak) rather than building custom. Reserve Core Domain effort for business differentiators.
- **Bounded Context**: Auth is a separate bounded context from domain contexts. User identity in the auth context maps to domain-specific concepts (e.g., `AuthUser` maps to `Customer`, `Doctor`, `Tenant`) via an Anti-Corruption Layer.
- **Context Map**: Auth context typically sits as a **Shared Kernel** (if custom) or **Conformist** relationship (downstream must conform to the auth provider's model — you do not negotiate with Cognito's data model).

### Architecture Patterns

- **Clean Architecture**: Auth belongs in the **Interface Adapters** layer (controllers/middleware verify tokens, inject identity) or **Frameworks & Drivers** layer (Cognito SDK, JWT library). Never in Entities. Use cases receive a verified identity as input — they do not perform authentication.
- **R&W Security Perspective**: Authentication and authorization are quality attributes applied across all viewpoints. Threat modeling (STRIDE) directly maps: Spoofing → strengthen AuthN, Elevation of Privilege → strengthen AuthZ.
- **AWS WAF Security Pillar**: "Implement a strong identity foundation" (SEC-1), "Apply least privilege" (SEC-3), "Automate security best practices" (SEC-6).

### Testing and Specification

- **BDD**: Authorization rules are excellent candidates for acceptance scenarios:
  ```gherkin
  Scenario: Editors can publish articles in their department
    Given a user with role "editor" in department "engineering"
    When they attempt to publish an article in department "engineering"
    Then the action should be permitted

  Scenario: Editors cannot publish articles in other departments
    Given a user with role "editor" in department "engineering"
    When they attempt to publish an article in department "marketing"
    Then the action should be denied
  ```
- **Threat Modeling**: Use STRIDE to identify auth gaps. Spoofing and Elevation of Privilege map directly to authentication and authorization weaknesses.

### Design Principles

- **Separation of Concerns**: Authentication (identity verification) and authorization (access control) are separate concerns. Implement them independently.
- **Least Privilege**: Grant minimum permissions required. Use scoped tokens, fine-grained policies, short-lived credentials.
- **Defense in Depth**: Layer security — API Gateway validates tokens AND services verify claims AND network policies restrict access.
- **Fail Closed**: Deny access by default. Every policy should start with `default deny`. Missing claims, expired tokens, or invalid signatures all result in rejection.
