
## 2024-05-18 - Set Security Headers Middlewares in `api_v2`
**Vulnerability:** Missing strict security response headers in the API service.
**Learning:** Security headers (like `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`) can be effectively applied across all routes using `tower_http::set_header::SetResponseHeaderLayer` in the Axum framework. `hyper::header` must be imported to configure valid header names. Extracting the `app` generation function simplifies running non-live router tests using `oneshot`.
**Prevention:** Integrate a shared configuration function for standard `tower_http` security middleware in future rust web services to guarantee all responses (including 404s/errors) receive secure headers.
