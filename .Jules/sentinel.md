## 2024-05-26 - Add Security Response Headers
**Vulnerability:** The Axum backend API lacked defense-in-depth HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum's `tower_http::set_header::SetResponseHeaderLayer` can be stacked to apply multiple headers. For the `tower_http` crate, the values used must be `hyper::header::HeaderValue::from_static(...)`.
**Prevention:** Include security response headers by default using `tower_http` middleware on all Axum routers.
