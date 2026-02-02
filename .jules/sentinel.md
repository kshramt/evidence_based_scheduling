## 2024-05-22 - Axum Middleware Testing Pattern
**Vulnerability:** N/A (Enhancement)
**Learning:** Testing middleware (like security headers) in Axum 0.7 requires decoupling the middleware stack from the stateful application logic.
**Prevention:** Use a dedicated `apply_middleware` function that takes and returns an `axum::Router`. This allows unit testing the middleware stack on a dummy router without mocking the entire application state (e.g., Database connections).

## 2024-05-22 - Parallel Test Execution in CI
**Vulnerability:** N/A (Stability)
**Learning:** Vitest/Playwright browser mode tests can suffer from race conditions when navigating (e.g., `page.goto`) in parallel, especially in resource-constrained CI environments.
**Prevention:** Set `fileParallelism: false` in `client/vite.config.ts` to ensure tests run sequentially and avoid navigation interruptions.
