## 2025-04-10 - Strict Content-Security-Policy with `default-src 'none'`
**Vulnerability:** Missing strict Content-Security-Policy (CSP) headers inside API.
**Learning:** `tower_http::set_header::SetResponseHeaderLayer` can inject CSP headers. However, applying a strict `default-src 'none'` completely breaks any HTML endpoints served directly by the API.
**Prevention:** Apply `default-src 'none'` only if endpoints don't serve HTML or override it on HTML-serving routes.
