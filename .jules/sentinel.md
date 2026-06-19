## 2026-06-19 - Proper Semantic HTTP Status Codes for Auth Failures
**Vulnerability:** Missing/invalid tokens and authorization failures returned generic 400 Bad Request instead of 401 Unauthorized / 403 Forbidden.
**Learning:** Returning 400 Bad Request for auth failures can obscure actual security events from monitoring tools, preventing automated detection of unauthorized access attempts or credential stuffing.
**Prevention:** Always enforce semantic HTTP status codes (401 for authentication, 403 for authorization) in API error handling logic to ensure security tooling can correctly classify and alert on failed auth events.
