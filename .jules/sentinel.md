## 2024-05-24 - Axum Default Security Headers
**Vulnerability:** Axum (v0.7) does not set default security headers like `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, or `Content-Security-Policy`.
**Learning:** Frameworks like Axum prioritize flexibility and minimalism, requiring developers to opt-in to security defaults.
**Prevention:** Use `tower_http::set_header::SetResponseHeaderLayer` to explicitly add these headers in the application router construction.
