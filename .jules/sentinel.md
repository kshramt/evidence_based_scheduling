## 2024-05-18 - Axum Default Security Headers
**Vulnerability:** The backend Axum application was missing basic security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum does not set default security headers. It must be explicitly configured using `tower_http::set_header::SetResponseHeaderLayer` in the middleware stack to ensure responses include them.
**Prevention:** When creating new Axum routers or services, always include the necessary `SetResponseHeaderLayer` middleware for basic security posture.
