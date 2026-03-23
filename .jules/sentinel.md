## 2024-05-18 - Missing Security Headers in Axum v0.7
**Vulnerability:** The Axum v0.7 application (`api_v2`) lacked basic security headers by default, exposing users to risks like XSS, clickjacking, and MIME sniffing attacks.
**Learning:** Axum, unlike some older or different ecosystem frameworks, does not set default security headers out-of-the-box. They must be explicitly configured using middleware.
**Prevention:** Use `tower_http::set_header::SetResponseHeaderLayer` to globally enforce headers such as `Content-Security-Policy` (e.g., `default-src 'none'; frame-ancestors 'none'; sandbox`), `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` when setting up the application `Router`.
