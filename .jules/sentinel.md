## 2025-04-25 - Extracted Axum Router for Middleware Testing
**Vulnerability:** The API lacked proper test coverage for Axum router middleware logic (e.g., security headers), resulting in potential untested security configuration logic.
**Learning:** Extracting the Axum router setup into a public `app` function (e.g., `pub fn app(state: Arc<AppState>) -> axum::Router`) enables integration testing of middleware via `tower::ServiceExt::oneshot` without spinning up a live server or database. By using a dummy db connection with `connect_lazy()`, tests can run in a CI environment completely isolated from runtime database setup.
**Prevention:** Apply the extracted router pattern and integration testing using `tower::ServiceExt` as a standard practice for verifying middleware layers.
