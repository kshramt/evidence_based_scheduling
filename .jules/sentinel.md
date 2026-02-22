## 2024-06-25 - [Missing Security Headers in Axum Backend]
**Vulnerability:** The Rust backend (`api_v2`) was missing standard security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection), leaving it vulnerable to clickjacking, MIME sniffing, and reducing defense-in-depth against XSS.
**Learning:** Axum/Tower-http does not include these headers by default. Verification requires extracting the application construction logic (`create_app`) to enable integration testing via `tower::ServiceExt::oneshot` without needing a full server or database connection.
**Prevention:** Always include `tower_http::set_header::SetResponseHeaderLayer` middleware in the application factory function and verify headers with integration tests.

## 2024-06-25 - [Insecure "Fake IDP" Authentication]
**Vulnerability:** The application uses a "Fake IDP" implementation that allows authentication by username alone without a password (`postFake_idploginid_token`), bypassing standard authentication controls.
**Learning:** The architecture prioritizes development simplicity over security, creating a critical risk if deployed to production in its current state.
**Prevention:** Replace the Fake IDP with a real OIDC provider or secure password authentication before any production deployment.
