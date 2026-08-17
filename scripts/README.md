# Worker extension point

This directory is reserved for background workers such as:

- job-source polling and normalization
- duplicate detection
- application preparation queues
- recruiter-email ingestion
- interview extraction
- analytics aggregation
- retry / dead-letter handling

The current app keeps the same boundary synchronous for local development; production should move long-running execution here or to a managed queue/worker platform.
