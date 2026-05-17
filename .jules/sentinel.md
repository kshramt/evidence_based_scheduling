## 2024-05-24 - Missing Security Headers in api_v2
**Vulnerability:** The Rust/Axum API (`api_v2`) lacks standard security headers such as `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.
**Learning:** Security headers should be explicitly configured in the Axum router using `tower_http::set_header::SetResponseHeaderLayer`. Since Axum does not include them by default, failure to configure these leaves the API open to potential clickjacking, MIME-type sniffing, and other web-based attacks.
**Prevention:** Ensure any new service endpoints or router instances apply common security headers via `tower_http` middlewares.
