## 2025-05-16 - API Security Headers Extracted

**Vulnerability:** Missing defense-in-depth HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) on API endpoints. While the API only returns JSON, setting a strict CSP (`default-src 'none'`) and preventing MIME-sniffing mitigates browser-based attacks.
**Learning:** The `api_v2` Axum router was initially defined directly in `main`, making it difficult to inject globally scoped `tower_http` middleware while keeping the router easily testable. Additionally, extracting the router into a public function required changing the visibility of the internal `AppState` struct to `pub`.
**Prevention:** Always extract application router configurations into a standalone, testable `pub fn app(state) -> axum::Router` function. Use `tower_http::set_header` layer explicitly with fully qualified paths to inject secure HTTP headers universally across all routes during configuration.
