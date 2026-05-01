## 2025-05-01 - Added Security Headers Middleware

**Vulnerability:** The application was missing basic standard security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), increasing the risk of Clickjacking, MIME-sniffing, and Cross-Site Scripting (XSS).
**Learning:** Adding HTTP security headers natively via Axum/Tower requires extracting the router out of the `main` execution scope into an `app` module to enable component testing without hitting the database, allowing middleware checks through `oneshot` simulated requests.
**Prevention:** Always encapsulate Axum routing layer initialization in a testable library module block (`app(state)`) rather than intertwining it with process initialization in `main.rs`, and enforce strict security header assertions as part of integration tests.
