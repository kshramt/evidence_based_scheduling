## 2024-05-24 - Add Security Headers to API
**Vulnerability:** Missing HTTP security headers (CSP, X-Content-Type-Options, X-Frame-Options) in the API layer exposes endpoints to potential MIME sniffing, framing attacks (clickjacking), and unintended content execution.
**Learning:** Security headers were configured in Nginx for the frontend, but Envoy routes API requests directly to the Rust backend, bypassing Nginx. The backend requires explicit configuration of security headers via `tower-http`.
**Prevention:** Implement `tower_http::set_header::SetResponseHeaderLayer` in Axum routers for all API services to enforce security headers natively at the application boundary, independent of reverse proxy configurations.
