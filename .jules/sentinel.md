## 2024-03-09 - Missing Security Headers in Axum API
**Vulnerability:** The `api_v2` Axum application was missing basic security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
**Learning:** Axum does not set default security headers. They must be explicitly configured via middleware, such as `tower_http::set_header::SetResponseHeaderLayer`.
**Prevention:** Always add a layer of security headers to any new Axum router, similar to standard practices in Express/Helmet or other web frameworks.
## 2024-03-09 - CI Navigation Race Conditions in Browser Tests
**Vulnerability:** Not a vulnerability, but a CI stability issue.
**Learning:** The frontend's Playwright/Vitest browser tests may fail with race conditions ("navigation interrupted") when tests run in parallel.
**Prevention:** Run Vitest in CI with `--no-file-parallelism` to ensure single-file test isolation when interacting with the browser runner.
