## 2025-02-18 - Missing Security Headers in Backend
**Vulnerability:** The `api_v2` backend lacked standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`), increasing exposure to XSS, clickjacking, and MIME sniffing attacks.
**Learning:** `axum` and `tower-http` do not apply these headers by default. Testing these headers effectively requires isolating the middleware application logic (e.g., `apply_middleware`) from the `main` function to enable unit testing without external dependencies like a database.
**Prevention:** Always verify security headers using automated tests. Use a dedicated `apply_middleware` function to allow unit testing of the middleware stack.
