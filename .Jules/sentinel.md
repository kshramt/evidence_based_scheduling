## 2024-05-15 - [Security Headers with axum and tower_http]
**Vulnerability:** Missing strict HTTP security headers.
**Learning:** Adding `Content-Security-Policy` with `default-src 'none'` is safe on the API endpoints since they only return JSON and aren't rendering HTML, while adding it broadly might break an application that serves UI from the same place. Here, it is safe as Nginx serves the UI and API serves JSON.
**Prevention:** Make sure `tower-http` with `set-header` is configured correctly on the global router.
