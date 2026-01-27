## 2024-05-23 - Insecure Authentication Mechanism
**Vulnerability:** The application uses a "Fake IDP" system where authentication tokens are simple Base64-encoded JSON objects (e.g., `{"user_id": "..."}`) without any cryptographic signature or verification.
**Learning:** This likely exists as a development shortcut that was not replaced with a production-ready solution. It allows complete account takeover by forging tokens.
**Prevention:** Always use standard, cryptographically secure authentication methods (OIDC, JWT with signatures) even in early development, or strictly enforce "dev-only" flags that prevent insecure auth in production builds.

## 2024-05-23 - Missing Security Headers in Axum
**Vulnerability:** The Axum backend was missing standard security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection), leaving it vulnerable to clickjacking and MIME sniffing.
**Learning:** Axum/Tower does not enable these headers by default. `tower_http::set_header` must be manually configured.
**Prevention:** Use a standard security middleware stack (like `tower_http`'s `SetResponseHeaderLayer`) in the application entry point for all new services.
