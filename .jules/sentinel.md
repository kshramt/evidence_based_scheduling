## 2024-03-07 - Add missing security headers to Axum backend
**Vulnerability:** The `api_v2` Axum application was missing basic security headers such as `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. Axum by default does not add these headers.
**Learning:** Axum requires developers to explicitly configure security headers using middleware like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always verify headers in Axum and ensure security middleware is added to the application router during initialization.
