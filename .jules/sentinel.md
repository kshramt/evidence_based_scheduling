## 2026-01-14 - Fake IDP Unsigned Tokens
**Vulnerability:** The application uses a "Fake IDP" authentication mechanism where `IdToken` is simply a base64-encoded JSON string containing a `user_id`. There is no cryptographic signature (like JWT) or server-side session validation for the token itself.
**Learning:** This design allows anyone to forge a token for any user ID if they know the ID.
**Prevention:** Use signed JWTs (HS256/RS256) or server-side sessions.
