
## 2026-04-11 - Missing Security Headers in Rust API
**Vulnerability:** Missing security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) in `api_v2` responses, which could lead to various client-side attacks.
**Learning:** Axum router does not provide default security headers. You must explicitly configure them using `tower_http::set_header::SetResponseHeaderLayer` and `hyper::header`. Furthermore, testing `api_v2` state initialization requires using `connect_lazy` with a dummy URI if not spinning up the full DB infrastructure.
**Prevention:** Always include a default set of security headers via tower middleware for any new web APIs written in Axum to ensure defense in depth, and utilize integration tests to verify middleware.
