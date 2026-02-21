## 2024-11-20 - [Missing Security Headers in Backend API]
**Vulnerability:** The `api_v2` service was missing standard security headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`). This exposed the API to potential XSS, clickjacking, and MIME sniffing attacks, relying solely on upstream proxies which might not be consistently configured.
**Learning:** Security headers should be enforced at the application level (defense in depth) rather than relying solely on infrastructure (like Envoy/Nginx), ensuring protection regardless of deployment topology.
**Prevention:** Implemented `tower_http::set_header::SetResponseHeaderLayer` middleware in `api_v2/src/main.rs` to enforce these headers on all responses.
