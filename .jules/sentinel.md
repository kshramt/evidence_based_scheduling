## 2024-05-23 - Middleware Testing Pattern
**Vulnerability:** N/A (Testing Pattern)
**Learning:** Testing Axum middleware (like security headers) is difficult if the `Router` construction is tightly coupled with `AppState` dependencies (like DB pools).
**Prevention:** Extract middleware application into a standalone function `apply_middleware(app: Router) -> Router`. This allows unit tests to create a dummy router, apply middleware, and verify headers using `app.oneshot()` without needing a real database connection.
