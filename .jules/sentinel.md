## 2024-05-24 - Missing Security Headers

**Vulnerability:** The Axum backend API endpoints lacked basic security headers (e.g., Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** `tower-http` with `features = ["full"]` already allows configuring layers via `SetResponseHeaderLayer::overriding()` with Axum routers. Memory logs should be saved to `.jules` specifically. Using `hyper::header` values mapped perfectly.
**Prevention:** Include these headers natively in standard middleware setup templates whenever standing up new Axum APIs.
