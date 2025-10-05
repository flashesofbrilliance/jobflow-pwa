Title: Company Research modal + provider interface (stub)
Labels: phase: phase-b, type: feature, area: research
Estimate: 2d
Dependencies: tracking-002-job-detail-modal-actions.md, CSP allowlist

Description
Add a Research modal that performs user-initiated lookups via a provider interface. Start with stubbed providers and loading states.

Acceptance Criteria
- Modal opens from Job Detail; shows loading state then results placeholder.
- Provider interface supports multiple sources; network calls only to allowlisted domains; no trackers.

Tasks
- Build modal UI and provider interface.
- Implement one stub provider; parameterize endpoints.
- Document required CSP domains in SECURITY.md.

Test Plan
- Playwright: modal opens, shows loading, and renders stub results; verify requests hit only allowlisted domains.

CSP/Privacy
- User-initiated fetches only; document endpoints; no third-party analytics; respect `script-src 'self'`.

