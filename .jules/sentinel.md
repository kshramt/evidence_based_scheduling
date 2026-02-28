## 2024-05-18 - Missing Security Headers in axum api_v2
**Vulnerability:** The axum `api_v2` backend did not set any security headers by default. This exposes the app to multiple vulnerabilities, including clickjacking, MIME sniffing, and downgrade attacks.
**Learning:** Axum does not set standard security headers by default. They must be explicitly added using middleware like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always ensure standard security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are explicitly added via middleware when scaffolding a new axum application.
