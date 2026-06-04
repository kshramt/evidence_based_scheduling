## 2024-05-24 - Missing Security Headers in Backend
**Vulnerability:** The backend Axum server in `api_v2/src/main.rs` does not include basic security headers like `X-Content-Type-Options`, `X-Frame-Options`, and `Strict-Transport-Security`. While the Nginx proxy includes a `Content-Security-Policy`, relying solely on the proxy can lead to vulnerabilities if the proxy configuration is bypassed or misconfigured.
**Learning:** Security headers should be configured directly within the backend service, providing a defense-in-depth approach.
**Prevention:** Always verify that fundamental security headers are included in HTTP responses using middleware (e.g., `tower-http`'s `SetResponseHeaderLayer`) when setting up web servers.
