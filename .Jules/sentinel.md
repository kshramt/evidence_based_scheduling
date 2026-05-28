## 2024-05-18 - [HTTP Security Headers]
**Vulnerability:** Missing strict HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) in the Axum API backend could allow attacks like XSS, Clickjacking, or MIME-type sniffing if HTML content were ever served or if browsers act unexpectedly.
**Learning:** `tower-http` makes it straightforward to add HTTP security headers using `SetResponseHeaderLayer`, but we must be careful to use `hyper::header` values correctly (e.g. `HeaderValue::from_static` and `HeaderName::from_static` for custom ones like referrer-policy).
**Prevention:** Ensure new services or endpoints are created with a secure baseline of HTTP response headers.
