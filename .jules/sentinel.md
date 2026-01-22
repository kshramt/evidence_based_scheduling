## 2024-05-22 - Insecure Authentication Mechanism
**Vulnerability:** The 'Fake IDP' authentication uses simple Base64-encoded JSON tokens (`IdToken`) without any cryptographic signature (JWT) or server-side validation of a session token beyond the user ID.
**Learning:** The application relies on client-side claimed identity (in the token) without verification, allowing trivial impersonation by crafting a base64 string.
**Prevention:** Use standard signed tokens (JWT) with a secret key, or server-side sessions. Verify signatures on every request.
