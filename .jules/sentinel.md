## 2024-05-22 - Axum Security Headers
**Vulnerability:** Missing default security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) in Axum v0.7 application.
**Learning:** Axum and Tower-HTTP do not inject these headers by default. They must be explicitly added via middleware layers like `SetResponseHeaderLayer`.
**Prevention:** Use `apply_middleware` pattern to enforce these headers on the router.
