## 2024-05-18 - [Add Security Headers to Backend API]
**Vulnerability:** Missing strict security headers (e.g. CSP, Strict-Transport-Security, X-Frame-Options) in the `api_v2` Axum backend endpoints.
**Learning:** Security headers are not applied automatically in Axum frameworks. Relying on reverse proxies (like nginx in `nginx.conf`) can lead to bypasses if endpoints are directly exposed or reverse proxy rules do not cover all traffic paths. Also, strict CSP (`default-src 'none'`) is highly beneficial and safe for pure JSON APIs.
**Prevention:** Integrate security headers directly at the application router level (e.g. `tower_http::set_header::SetResponseHeaderLayer`) as a fundamental layer of defense.
