Title: Security — CSP hardening (Phase B)
Labels: phase: phase-b, type: security, area: security
Estimate: 1d
Dependencies: None

Description
Enforce strict CSP, remove CDN usage, and allowlist only necessary discovery/research domains.

Acceptance Criteria
- `script-src 'self'`; no CDN scripts used.
- `connect-src` only includes enabled discovery domains (add Arbeitnow when used) and any research domains documented.
- SECURITY.md updated with domains and guidance; stale references removed.

Tasks
- Audit index.html CSP and code for external scripts.
- Update SECURITY.md with allowlisted domains and no-CDN policy.
- Verify discovery connectors fetch only from allowlisted origins.

Test Plan
- Lighthouse/DevTools: zero external requests in core flows; no CSP violations; console clean.

