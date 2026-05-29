## 2024-05-24 - Missing Security Headers in Rust API
**Vulnerability:** The Rust backend (`api_v2`) lacked standard security headers like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy. This exposed endpoints to risks like clickjacking, MIME-type sniffing, and less secure cross-origin requests.
**Learning:** `tower_http` provides a convenient `SetResponseHeaderLayer` to add custom headers globally to an `axum` router.
**Prevention:** Apply `tower_http::set_header::SetResponseHeaderLayer` for essential security headers when configuring new backend services.
