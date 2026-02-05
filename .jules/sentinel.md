## 2024-05-22 - Missing Security Headers Gap
**Vulnerability:** API responses lacked standard security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection) despite external documentation/memory suggesting they were present.
**Learning:** Reliance on memory or outdated documentation for security posture is dangerous. The 'missing' headers exposed the app to potential clickjacking and MIME sniffing attacks.
**Prevention:** Verify security configurations directly in the code (e.g., via automated tests) rather than assuming they exist based on prior knowledge.
