## 2024-06-28 - Add Security Headers to API
**Vulnerability:** Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) on the Rust API responses, exposing the API to various attacks like clickjacking and MIME sniffing.
**Learning:** The application uses Nginx to handle frontend security headers, but Envoy routes API requests (`/api/v2/`) directly to the backend service. Therefore, Nginx security header configurations are bypassed for the API.
**Prevention:** Configure security headers directly in the backend service using `tower_http::set_header::SetResponseHeaderLayer` in the Axum router, ensuring API responses are protected independently of the proxy layer.
