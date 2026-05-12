## 2024-05-12 - Secure HTTP Headers via Middleware
**Vulnerability:** Missing basic security headers.
**Learning:** In Rust with Axum and `tower-http`, do not chain `.overriding()` calls to configure multiple headers using the same generic `SetResponseHeaderLayer` instantiation as each overriding creates a new layer instance. Also, frontend artifacts should not be committed.
**Prevention:** Apply each security header in its own separate middleware layer wrapping the router. Verify `.gitignore` prevents artifacts from being tracked during testing.
