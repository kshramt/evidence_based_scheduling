## 2024-05-23 - [Missing Security Headers in API]
**Vulnerability:** The API (`api_v2`) was serving responses without standard security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).
**Learning:** Axum, unlike some other frameworks, does not set these headers by default. Explicit middleware is required.
**Prevention:** Always use `tower_http::set_header::SetResponseHeaderLayer` or similar middleware to enforce security defaults in Axum applications.
