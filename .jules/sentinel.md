## 2024-05-23 - Reusable Security Headers Pattern in Axum
**Vulnerability:** Missing default security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection) in api_v2.
**Learning:** Axum requires explicit middleware for security headers. `tower-http` provides `SetResponseHeaderLayer` for this. Grouping middleware in `apply_middleware` allows for isolated testing of security configuration.
**Prevention:** Use the `apply_middleware` function pattern in `api_v2/src/main.rs` to enforce security headers and verify them with `tower::ServiceExt::oneshot` tests.
