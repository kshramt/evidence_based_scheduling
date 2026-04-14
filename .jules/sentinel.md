## 2024-05-15 - [Strict CSP on JSON APIs]
**Vulnerability:** Missing Content Security Policy (CSP) headers leaving the API potentially vulnerable to content sniffing or unexpected rendering behaviors if a browser directly loads an endpoint.
**Learning:** A strict CSP (`default-src 'none'`) is safe to apply on this API because it only serves JSON responses and never serves HTML. Applying this mitigates risks without breaking legitimate API usage.
**Prevention:** Always consider applying strict security headers, including `default-src 'none'` for CSP, to pure API services that do not render HTML.
