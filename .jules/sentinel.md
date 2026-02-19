## 2024-05-23 - [Security Headers & Testing Pattern]
**Vulnerability:** API responses lacked standard security headers (CSP, X-Content-Type-Options, X-Frame-Options), increasing risk of XSS and Clickjacking.
**Learning:** `api_v2` was structured with `main` doing all setup, making it hard to test middleware without a running DB. Refactoring to `create_app` enables `tower::ServiceExt::oneshot` testing with lazy DB connections.
**Prevention:** Always extract app construction into a testable function. Use `tower_http::set_header::SetResponseHeaderLayer` for default security headers.
