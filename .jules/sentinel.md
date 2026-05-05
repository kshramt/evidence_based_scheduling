## 2024-05-05 - Strict Content Security Policy for Pure JSON APIs
**Vulnerability:** Missing security headers, specifically CSP, allowed potential execution of unintended content if endpoints were mistakenly accessed or configured to serve HTML.
**Learning:** For a pure JSON API like `api_v2`, a maximum restrictive CSP (`default-src 'none'; frame-ancestors 'none'; sandbox`) is extremely effective and safe, as the API should strictly serve JSON data and never execute inline scripts or render HTML.
**Prevention:** Apply a strict CSP middleware globally on Axum routers serving JSON to proactively defend against XSS and clickjacking via unexpected content types.
