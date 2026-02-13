## 2024-05-23 - Axum Security Headers Pattern
**Vulnerability:** Default Axum setup lacks standard security headers like `X-Frame-Options` and `X-Content-Type-Options`.
**Learning:** `axum` (v0.7) and `tower-http` (v0.6) separate middleware concerns. Headers must be explicitly added. The `apply_middleware` pattern allows testing middleware isolation without a full app state.
**Prevention:** Use `tower_http::set_header::SetResponseHeaderLayer` in a dedicated middleware function and unit test it using `oneshot`.
