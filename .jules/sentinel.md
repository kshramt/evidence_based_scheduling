## 2024-03-12 - Missing Security Headers in Axum
**Vulnerability:** API missing critical security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum v0.7 does not set default security headers automatically, they must be explicitly added via middleware (e.g., `tower_http::set_header::SetResponseHeaderLayer`).
**Prevention:** Always configure `SetResponseHeaderLayer` with standard secure headers when initializing an Axum server.
