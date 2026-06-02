## 2024-06-02 - Token Signature Verification Missing
**Vulnerability:** The API accepts base64-encoded user IDs as "IdTokens" without verifying any signature or applying any cryptographic validation.
**Learning:** `IdToken` simply decodes from base64 and trusts the `user_id` inside it without a signature. This is equivalent to insecure session management where users can easily spoof their identity.
**Prevention:** Always verify signatures on authentication tokens (e.g. using standard JWT validation) to prevent identity spoofing.
## 2024-06-02 - Missing HTTP Security Headers
**Vulnerability:** The API service lacks common HTTP security headers, potentially exposing users to various web-based attacks (e.g., MIME sniffing, XSS, clickjacking).
**Learning:** Security headers should be configured globally using axum middleware (e.g., `tower-http`'s `SetResponseHeaderLayer`) to provide defense in depth.
**Prevention:** Implement security headers using middleware during application initialization.
