# Event Schema (Local Only)

- discovery_run: { ts, data: { sources, discovered, inserted, skipped } }
- csv_import_start: { ts, data: { rowsAttempted } }
- csv_import_complete: { ts, data: { rowsAttempted, rowsImported, skipped } }
- qualify_accept: { ts, data: { opportunityId, fitCat, confidence, tags } }
- qualify_reject: { ts, data: { opportunityId, fitCat, confidence, tags } }
- app_install_prompt: { ts }
