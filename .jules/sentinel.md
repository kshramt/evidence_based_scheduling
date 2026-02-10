## 2024-05-23 - [Adding Security Headers to Axum API]
**Vulnerability:** Missing standard security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection) in Axum API.
**Learning:** `tower_http::set_header::SetResponseHeaderLayer` is the standard way to add these headers in Axum/Tower applications. Tests can be written using `oneshot` on the router without starting the full server.
**Prevention:** Always include `tower-http` with `set-header` feature and apply these headers as middleware in the application setup.
