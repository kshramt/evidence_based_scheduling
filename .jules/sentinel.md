## 2024-08-10 - Add Content-Security-Policy to API Responses
**Vulnerability:** The API lacks a strict Content-Security-Policy (CSP) header, allowing potential content injection if endpoints are improperly handled by a browser.
**Learning:** Security headers like CSP are just as critical for APIs to enforce the "defense in depth" strategy and protect against MIME-sniffing or unexpected rendering in browsers.
**Prevention:** Implement `tower_http::set_header::SetResponseHeaderLayer` universally in the backend to ensure headers are applied safely without explicitly returning them in every response.
