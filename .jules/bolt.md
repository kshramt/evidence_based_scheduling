## 2024-05-22 - Batch Deletion with UNNEST
**Learning:** SQLx `query!` macro requires compile-time database connectivity or up-to-date `.sqlx` files. When modifying queries without a running DB, use `sqlx::query` (function) and explicit `unnest($1, $2, ...)` with arrays to avoid N+1 queries.
**Action:** Use `UNNEST` with `Vec<T>` for batch operations to reduce round-trips. Prefer `sqlx::query` when offline verification is not possible.
