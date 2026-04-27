## 2024-04-27 - Security Headers Missing
**Vulnerability:** The `api_v2` Axum backend was lacking standard HTTP security headers (e.g., Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy).
**Learning:** These APIs serve sensitive patch/state data and should enforce strict security protocols using `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** I need to always verify security headers are configured during application boot logic in `src/main.rs`.
