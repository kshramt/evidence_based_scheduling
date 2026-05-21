## 2024-05-24 - Tower-HTTP Axum Integration Security Headers
**Vulnerability:** Missing strict security headers in Axum API.
**Learning:** `tower_http::set_header::SetResponseHeaderLayer::overriding()` in Axum allows enforcing secure HTTP defaults, but chaining headers requires `.layer()` for each because `overriding()` returns a new layer, and header names MUST use `hyper::header` values.
**Prevention:** Incorporate `SetResponseHeaderLayer` calls with specific security values into base router configurations explicitly upon setup.
