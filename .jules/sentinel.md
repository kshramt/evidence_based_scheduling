## 2024-04-20 - Missing Security Headers in Rust API

**Vulnerability:** The API lacked proper security headers like CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.
**Learning:** Axum requires tower-http's `SetResponseHeaderLayer` alongside `hyper::header` definitions to implement headers globally. When integrating, Axum router apps should be extracted into a function separate from the main entry point to enable testing without db dependencies.
**Prevention:** Include a standard security headers middleware layer using tower-http when initializing any Axum router application.
