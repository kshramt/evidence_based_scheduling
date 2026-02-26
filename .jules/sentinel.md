## 2024-05-23 - [Missing Security Headers in Axum]
**Vulnerability:** The Axum backend (`api_v2`) lacked standard security headers (CSP, HSTS, X-Frame-Options, etc.), relying partially on Nginx but leaving direct API access vulnerable.
**Learning:** Axum (and `tower-http`) does not apply security headers by default. They must be explicitly added via middleware layers.
**Prevention:** Always verify security headers on API responses directly, not just via the ingress proxy. Use `tower_http::set_header::SetResponseHeaderLayer` to enforce them at the application level.
