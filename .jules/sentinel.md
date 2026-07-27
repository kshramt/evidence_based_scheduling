## 2024-05-24 - Add Security Headers
**Vulnerability:** Missing HTTP Security Headers in the Rust backend
**Learning:** Axum backends must configure their own security headers, as API traffic bypasses Nginx.
**Prevention:** Apply strict headers (CSP, X-Frame-Options, X-Content-Type-Options) to API middleware using `tower_http`.
