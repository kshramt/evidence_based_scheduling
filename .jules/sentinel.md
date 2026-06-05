## 2024-06-05 - Security Headers Implementation
**Vulnerability:** The API lacked basic security headers, exposing users to a number of potential attacks such as MIME-sniffing, clickjacking, and XSS without standard browser-enforced mitigations.
**Learning:** `tower_http::set_header::SetResponseHeaderLayer` acts as a builder in axum when chained; using `.layer` repeatedly allows setting multiple distinct headers safely. If the header key is non-standard, use `HeaderName::from_static("...");`.
**Prevention:** Consider creating an isolated configuration builder module for response headers so they are added to all current and future endpoints uniformly.
