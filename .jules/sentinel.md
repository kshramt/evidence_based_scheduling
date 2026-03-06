## 2024-05-20 - Axum (v0.7) Missing Default Security Headers
**Vulnerability:** The API responses lack default security headers.
**Learning:** Axum (v0.7) does not provide default security headers; they must be explicitly added via middleware layers like `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always verify and manually configure security headers when using Axum or similar frameworks that do not set them by default.
