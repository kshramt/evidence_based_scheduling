## 2024-05-23 - [Middleware Isolation for Security Headers]
**Vulnerability:** Missing security headers (X-Content-Type-Options, etc.) in Axum application.
**Learning:** Testing middleware configuration in Axum `main` is difficult because `main` consumes the router.
**Prevention:** Extract middleware application into a `apply_middleware` function that takes and returns `axum::Router`. This allows unit testing the middleware stack without starting the full server or mocking database connections.
