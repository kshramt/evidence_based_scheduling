## 2026-02-24 - [Standard Security Headers in Axum]
**Vulnerability:** The API service (`api_v2`) lacked standard HTTP security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection), leaving it exposed to clickjacking, MIME sniffing, and downgrade attacks.
**Learning:** Axum does not set these headers by default. `tower_http::set_header::SetResponseHeaderLayer` must be manually configured for each header. Strict CSP (`default-src 'none'`) is safe for JSON APIs but requires careful testing if any HTML is served.
**Prevention:** Use a centralized `create_app` factory function that applies a standard security middleware stack to all Axum routers. Verify headers with `tower::ServiceExt::oneshot`.
