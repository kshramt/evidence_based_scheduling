## 2024-05-22 - Missing Security Headers in Backend
**Vulnerability:** The backend (`api_v2`) was missing standard security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`), increasing exposure to Clickjacking and MIME sniffing attacks.
**Learning:** Axum/Tower middleware setup in `main` was not easily testable, hiding the lack of headers.
**Prevention:** Always extract middleware application into a separate function (e.g., `apply_middleware`) and add unit tests verifying the presence of critical security headers.
