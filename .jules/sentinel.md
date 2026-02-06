## 2024-10-25 - Centralized Middleware for Security Headers
**Vulnerability:** Missing default security headers (X-Frame-Options, etc.) across the application.
**Learning:** Axum 0.7 + Tower requires manual composition of header layers. `axum::http` lacks constants for some legacy security headers.
**Prevention:** Established `apply_middleware` pattern in `main.rs` to enforce security headers globally and enable isolated testing of middleware stack.
