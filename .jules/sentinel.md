## 2023-10-27 - Missing Security Headers on API Endpoints
**Vulnerability:** The Rust backend (`api_v2`) lacked standard security headers such as `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.
**Learning:** These basic headers are crucial for defense-in-depth, protecting API endpoints from common browser-side exploits like XSS, framing attacks, and MIME-sniffing, even if it primarily serves JSON.
**Prevention:** Ensure the `tower_http::set_header::SetResponseHeaderLayer` middleware is applied globally on Axum routers to enforce these protections on all responses.
