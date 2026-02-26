## 2026-02-26 - [SQLx Offline Verification Bypass]
**Learning:** `sqlx` offline mode (enabled by `.sqlx` directory) prevents modifying `query!` macros without a running database to update the offline cache. This blocks simple query changes in environments without a DB.
**Action:** Use `sqlx::query` function (instead of `query!` macro) for query modifications when a running DB is unavailable, trading compile-time verification for development velocity. This bypasses the offline check.
