## 2024-03-24 - [Missing Security Headers in API]
**Vulnerability:** The Axum `api_v2` backend lacked baseline HTTP security headers (e.g. CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum v0.7 does not set these by default. Nginx proxy settings were only applying some headers like CSP frame-ancestors to HTML content, leaving pure API endpoints exposed.
**Prevention:** Ensure new Axum services or endpoints enforce strict HTTP security headers via `tower_http::set_header::SetResponseHeaderLayer` by default.
