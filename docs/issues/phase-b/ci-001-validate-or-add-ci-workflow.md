Title: CI — Validate or add CI workflow
Labels: phase: phase-b, type: infra, area: ci
Estimate: 0.5d
Dependencies: None

Description
README mentions a GitHub Actions workflow at `.github/workflows/ci.yml`. Verify it exists and runs lint, build, Playwright smoke, and Lighthouse budget. Add/update if missing.

Acceptance Criteria
- CI workflow exists and runs on PRs and main; executes lint, build, Playwright smoke, and Lighthouse budget (or document if Lighthouse runs locally).
- Status badges/README updated if applicable.

Tasks
- Audit repository for `.github/workflows/ci.yml`.
- If missing, add minimal workflow; if present, update steps.
- Document CI behavior in README.

Test Plan
- Push a test branch (or dry-run locally); ensure steps pass.

