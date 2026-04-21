
## 2024-05-24 - API Security Headers Enforcement
**Vulnerability:** The Axum backend API lacked basic HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), increasing the risk of content injection or clickjacking if API responses were somehow rendered in a browser context.
**Learning:** Extracting the `axum::Router` configuration from `main` into a standalone function `pub fn app(state: Arc<AppState>) -> axum::Router` allows for clean, isolated testing of middleware (like security headers) using `tower::ServiceExt::oneshot` against non-existent routes without requiring a live database connection.
**Prevention:** Ensure all new services or refactored router configurations apply strict default headers (e.g., `default-src 'none'`) and maintain testable isolation for their middleware stacks.
