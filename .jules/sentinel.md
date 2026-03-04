## 2024-05-24 - Missing Axum Default Security Headers
**Vulnerability:** The `api_v2` Axum application was missing basic HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum does not set these by default. They must be explicitly configured using middleware like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always ensure standard security headers are applied to the `axum::Router` middleware stack.
