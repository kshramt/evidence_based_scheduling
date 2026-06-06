## 2024-11-20 - Missing HTTP Security Headers
**Vulnerability:** The Axum backend does not set fundamental HTTP security headers, including `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `Content-Security-Policy`.
**Learning:** Rust's Axum framework does not configure security headers by default. `tower_http::set_header::SetResponseHeaderLayer` must be manually applied.
**Prevention:** Apply security headers globally using `tower-http` to enforce best practices and defense-in-depth across the API.
