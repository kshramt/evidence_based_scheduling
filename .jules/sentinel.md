## 2024-10-24 - Security Headers Added

**Vulnerability:** Missing security headers allowed potential attacks such as clickjacking and content sniffing.
**Learning:** Axum routes need `tower_http::set_header::SetResponseHeaderLayer` to add common security headers explicitly.
**Prevention:** Using `tower_http` simplifies adding security headers across the `api_v2` app to enforce security configurations out of the box.
