## 2024-05-22 - Fake IDP Insecurity
**Vulnerability:** The 'Fake IDP' authentication mechanism uses Base64 encoded JSON objects as 'tokens' without any cryptographic signature or verification.
**Learning:** Development/Mock authentication providers can easily be mistaken for secure implementations if not clearly labeled and if they share code paths with production logic.
**Prevention:** Ensure mock authentication is strictly separated from production code or use real cryptographic verification even in mocks (e.g. with a fixed development key).
