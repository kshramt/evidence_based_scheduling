## 2024-05-23 - [Batch Operations on Composite Keys]
**Learning:** Batch operations on composite keys (e.g. `(client_id, session_id, patch_id)`) are efficiently implemented in Postgres using `UNNEST` with parallel arrays, rather than `IN` clauses or N+1 query loops.
**Action:** Use `unnest($1, $2, ...)` with parallel vectors and `sqlx::query` (bypassing the strict macro check if offline) for optimal performance.
