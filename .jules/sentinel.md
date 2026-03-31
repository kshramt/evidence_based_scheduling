## 2024-05-24 - Missing Strict Security Headers in Axum Router

**Vulnerability:** The Axum router for the `api_v2` backend service did not set critical security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum 0.7 does not set security headers by default. A strict CSP (`default-src 'none'`) and other headers must be explicitly configured using `tower_http::set_header::SetResponseHeaderLayer` in the main router setup to establish a secure baseline for the API responses.
**Prevention:** Include a standard security headers configuration (e.g., using `tower-http`) when defining the global Axum app router, extracting it into a reusable `app` function for testability.
