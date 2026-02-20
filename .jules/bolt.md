## 2024-05-22 - SQLX Offline Verification Workaround
**Learning:** When developing without a running database, `sqlx::query!` macro fails if the schema or query changes because it cannot update offline verification files (`.sqlx`).
**Action:** Use `sqlx::query` function (runtime checked) instead of the macro for new queries or optimizations that change query structure, to bypass build-time verification blocks.
