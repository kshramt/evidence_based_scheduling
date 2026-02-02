## 2024-05-22 - Axum Middleware Testing Pattern
**Vulnerability:** N/A (Enhancement)
**Learning:** Testing middleware (like security headers) in Axum 0.7 requires decoupling the middleware stack from the stateful application logic.
**Prevention:** Use a dedicated `apply_middleware` function that takes and returns an `axum::Router`. This allows unit testing the middleware stack on a dummy router without mocking the entire application state (e.g., Database connections).
