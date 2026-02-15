## 2024-05-24 - Missing Security Headers in Axum v0.7
**Vulnerability:** The backend API was missing standard security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection), leaving it vulnerable to MIME sniffing and clickjacking attacks.
**Learning:** Axum v0.7 does not include default security headers. They must be explicitly added via middleware like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always include a security middleware stack when initializing Axum routers, specifically setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection: 1; mode=block`.
