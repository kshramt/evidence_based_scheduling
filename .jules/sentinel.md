## 2024-05-27 - Security Headers in axum API
**Vulnerability:** The `api_v2` backend did not enforce security headers.
**Learning:** `nginx.conf` only configures standard security headers for the frontend, but Envoy routes `/api/v2/` directly to the `api_v2_service`, bypassing Nginx entirely. Security headers for the API must be configured directly within the Axum service using `tower_http`.
**Prevention:** Future microservices or API routers directly exposed by the ingress should implement their own security headers, rather than assuming standard reverse proxy behavior applies across all routes.
