## 2024-05-22 - Fake IDP Authentication Bypass
**Vulnerability:** The "Fake IDP" authentication mechanism (`api_v2/src/gen.rs`) validates tokens by simply Base64 decoding them and checking the `user_id` field. There is no cryptographic signature verification (JWT or otherwise).
**Learning:** Any user can impersonate any other user by crafting a Base64-encoded JSON string `{"user_id": "target_user"}`. This appears to be a development/testing feature ("Fake IDP") that might be exposed or relied upon.
**Prevention:** In production, a real IDP with signed tokens (e.g., OIDC/OAuth2 with RS256) must be used. Do not use Fake IDP in production.
