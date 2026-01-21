## 2026-01-21 - Fake IDP Insecure Tokens
**Vulnerability:** The application uses a "Fake IDP" for authentication which issues tokens that are simple Base64-encoded JSON objects (e.g., `{"user_id": "..."}`) without any cryptographic signature or verification.
**Learning:** This allows trivial impersonation by crafting a similar token for any user ID. The name "Fake IDP" implies it might be for testing, but it is exposed in the main API structure, posing a risk if deployed or if development assumptions leak to production.
**Prevention:** Use standard JWT libraries with cryptographic signing (HS256 or RS256) even for mock IDPs, or ensure the Fake IDP is strictly compiled out of production builds.
