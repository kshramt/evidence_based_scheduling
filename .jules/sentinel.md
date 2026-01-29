## 2026-01-29 - Critical Auth Bypass in Fake IDP
**Vulnerability:** The "Fake IDP" authentication mechanism uses insecure Base64-encoded JSON tokens (`{"user_id": "..."}`) without any cryptographic signature or verification.
**Learning:** This likely exists to facilitate easy development and testing without setting up a real OIDC provider, but it completely bypasses authentication security if deployed or accessible.
**Prevention:** Always use cryptographically signed tokens (e.g., JWT with HS256/RS256) even for mock IDPs, or ensure the mock IDP is strictly isolated and never used in environments where security matters.
