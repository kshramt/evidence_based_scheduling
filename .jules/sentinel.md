## 2024-04-26 - Add Security Headers to API
**Vulnerability:** Missing security headers on API responses (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** The `api_v2` service serves sensitive data but lacked basic HTTP security headers. The Axum router setup was inline in `main()`, making it difficult to test middleware. By extracting the router to `pub fn app(state: Arc<AppState>) -> axum::Router`, we can easily add and test `tower_http` security header layers. Strict CSP (`default-src 'none'`) is safe here because it's a JSON API, not serving HTML.
**Prevention:** Ensure all new services include a standard set of security headers from the start, and structure router initialization so it's easily testable.
