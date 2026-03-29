## 2024-05-20 - Missing Security Headers in axum v0.7
**Vulnerability:** The application was missing basic security headers like `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. Axum v0.7 does not set security headers by default.
**Learning:** Axum requires explicit configuration to add standard security headers. Using `tower_http::set_header::SetResponseHeaderLayer` is the idiomatic way to enforce strict security headers across all endpoints.
**Prevention:** Ensure new Axum services or endpoints explicitly configure security headers to protect against common web vulnerabilities.
