## 2024-06-25 - API Security Headers Bypass
**Vulnerability:** Missing HTTP security headers (CSP, X-Content-Type-Options, X-Frame-Options) on `/api/v2/` responses.
**Learning:** Envoy routes `/api/v2/` directly to the `api_v2_service`, bypassing the `nginx.conf` where HTML security headers are configured.
**Prevention:** API services must configure their own security headers directly in the backend (e.g., via `tower_http` in Axum) rather than relying on the frontend proxy.
