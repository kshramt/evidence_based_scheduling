## 2024-05-23 - Fake IDP Authentication Weakness
**Vulnerability:** The `FakeIdp` authentication mechanism accepts base64-encoded JSON tokens without any signature verification.
**Learning:** This "fake" mechanism is likely for development but poses a severe risk if exposed in production or if developers assume it provides any security.
**Prevention:** In production, use a real Identity Provider (OIDC, OAuth2) or at least sign the tokens (JWT) to prevent forgery. For this specific repo, `FakeIdp` suggests it's a known non-production component, but awareness is key.

## 2024-05-23 - Missing Input Validation on Text Fields
**Vulnerability:** Several API endpoints accepted unbounded `name` strings, relying solely on Axum's body limit (40MB), which could lead to DB spam or minor DoS.
**Learning:** Even with Rust's type safety and SQLx's injection protection, logical limits on input size (length of strings) must be explicitly enforced.
**Prevention:** Always validate the length of user input strings at the API boundary before passing them to the business logic or database.
