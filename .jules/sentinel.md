## 2026-06-08 - Missing Security Headers
**Vulnerability:** The API server currently doesn't implement any HTTP security headers (like Content-Security-Policy, X-Frame-Options, X-Content-Type-Options). This leaves the application vulnerable to clickjacking, MIME-type sniffing, and other cross-site scripting related attacks.
**Learning:** Security headers are not enabled by default in typical axum servers unless explicitly configured via middlewares like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Use `tower_http::set_header::SetResponseHeaderLayer` to append security headers on all responses at the router level.
