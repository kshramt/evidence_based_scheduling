## 2024-05-15 - Missing Security Headers

**Vulnerability:** The `api_v2` Axum backend lacks important security headers, such as `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. This leaves the API vulnerable to various client-side attacks, even if it primarily serves JSON.
**Learning:** `tower_http` does not include security headers by default. It must be explicitly configured using `SetResponseHeaderLayer`.
**Prevention:** Whenever setting up an Axum API, configure strict security headers early on using `tower_http::set_header::SetResponseHeaderLayer`.
