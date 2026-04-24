## 2024-05-18 - [Security Headers Middleware]
**Vulnerability:** Missing strict security headers in Axum API.
**Learning:** By extracting the application setup logic into a `pub fn app(state: Arc<AppState>) -> axum::Router` function, we can cleanly wrap it with a `SetResponseHeaderLayer` to add comprehensive headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). To test this logic without a running DB, we can use `PgPoolOptions::new().connect_lazy("postgres://invalid:invalid@localhost/invalid")` with `tower::ServiceExt`'s `oneshot`.
**Prevention:** Always verify that security middlewares are tested using `oneshot` requests in unit tests rather than relying entirely on end-to-end integration environments.
