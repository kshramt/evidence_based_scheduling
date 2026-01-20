## 2026-01-20 - Middleware Testing Pattern
**Vulnerability:** Lack of verification for global security headers (Defense in Depth).
**Learning:** `main.rs` contained middleware logic that was coupled to the server startup, making it impossible to unit test security configurations without spinning up the full application (which requires a database).
**Prevention:** Extracted `apply_middleware` function in `api_v2/src/main.rs`. This allows testing security headers and other middleware layers using `axum::Router` and `oneshot` requests in isolation, bypassing database dependencies.
