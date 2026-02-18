## 2024-12-07 - Axum Security Headers
**Vulnerability:** Missing default HTTP security headers in Axum.
**Learning:** Axum v0.7 does not provide default security headers like `X-Content-Type-Options` or `Content-Security-Policy`.
**Prevention:** Explicitly add `tower_http::set_header::SetResponseHeaderLayer` middleware in the `create_app` function for all services.
