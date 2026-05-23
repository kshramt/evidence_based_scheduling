## 2024-05-23 - Add Strict Security Headers
**Vulnerability:** Missing strict security headers in Axum API.
**Learning:** Axum tower-http requires explicitly setting security headers to defend against various web vulnerabilities, notably XSS and clickjacking. When doing so, ensure `hyper::header` values match types Axum expects. Also `FakeIdpCreateIdTokenRequest` is unused in tests, so we had to add `#[allow(dead_code)]`.
**Prevention:** Apply strict security headers for API by default.
