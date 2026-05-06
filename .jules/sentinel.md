## 2024-05-06 - Extracting Axum router for testability

**Learning:** When testing Axum router logic (like middleware) in `api_v2`, place tests directly inline within `api_v2/src/main.rs` inside a `#[cfg(test)] mod tests { ... }` block rather than creating separate files in `api_v2/tests/`. To facilitate this without duplicating middleware layer configuration, the Axum router setup should be extracted into a standalone function (`pub fn app(state: Arc<AppState>) -> axum::Router`) that can be instantiated by both `main` and test modules.
**Action:** Always extract the Axum app router creation to a public function when adding testable server configuration (like security headers).
