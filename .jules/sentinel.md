## 2024-05-23 - Identity Spoofing in Fake IDP
**Vulnerability:** The "Fake IDP" authentication used unsigned, base64-encoded JSON objects as tokens, allowing arbitrary user impersonation.
**Learning:** Even "fake" or "demo" authentication systems must provide cryptographic proof of identity if they are used to gate access to resources, otherwise the security model is completely broken.
**Prevention:** Always sign identity tokens (e.g. using JWT) and verify signatures on the backend, even for simple or mock IDPs.
