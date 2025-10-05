# Security & Privacy

- Offline‑first, no external trackers; strict CSP (`script-src 'self'; connect-src 'self' + allowlisted RSS/API domains`).
- No CDN libraries. Bundle charting and other libs locally to comply with CSP.
- Local events only; no PII exfiltration. Export is explicit opt‑in (CSV/JSON).
- Harden CSP for discovery and research providers you enable (WeWorkRemotely, Remotive, Jobicy, RemoteOK, Working Nomads, NoDesk, Himalayas, Arbeitnow). Allow only required origins and methods.
- Report issues: open an issue with reproduction; do not include personal data.
