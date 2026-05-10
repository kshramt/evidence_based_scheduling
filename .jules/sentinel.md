## 2024-05-10 - Strict Security Headers in Rust Axum

**Vulnerability:** Missing standard HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) in the `api_v2` JSON API. While it's a JSON API and not directly rendering HTML, defense in depth requires these to prevent MIME-sniffing and UI redressing if an endpoint is accessed directly or unexpectedly returns an error page.

**Learning:** When configuring headers in `tower_http` for Axum in Rust, the `http` crate is not linked by default, causing resolution errors. The solution is to use the `hyper::header` module (e.g., `hyper::header::CONTENT_SECURITY_POLICY`). Furthermore, `SetResponseHeaderLayer::overriding()` in `tower-http 0.6` is a constructor, so multiple `.layer()` calls are required instead of chaining `.overriding()`. Non-standard headers like Referrer-Policy must use `HeaderName::from_static("referrer-policy")` rather than assuming a named constant exists.

**Prevention:** To avoid compilation errors, always apply multiple HTTP security headers using multiple `.layer()` wrappers around the Axum router, explicitly relying on `hyper::header::HeaderName::from_static` for custom/non-standard header names.
