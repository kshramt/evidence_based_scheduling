## 2024-05-22 - [Refactoring for Security Testing]
**Vulnerability:** Inability to test security middleware (like headers) without a running database connection, leading to untested security configurations.
**Learning:** Refactoring application construction into a `create_app` function allows for isolated testing of middleware using `tower::ServiceExt` and `sqlx::postgres::PgPoolOptions::new().connect_lazy(...)`.
**Prevention:** Always structure Axum applications with a separate `create_app` function and use lazy DB connections for middleware unit tests.
