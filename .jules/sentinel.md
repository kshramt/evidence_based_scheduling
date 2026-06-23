## 2024-06-23 - Proper HTTP Status Codes for Authentication & Authorization
**Vulnerability:** The application was returning a generic 400 Bad Request instead of 401 Unauthorized for invalid/missing tokens, and 400 instead of 403 Forbidden for failed authorization checks (IDOR attempts).
**Learning:** Overloading generic error codes (like 400) masks true security events (authentication failures vs authorization failures) and makes security logging, rate limiting, and alerting much less effective.
**Prevention:** Always implement and enforce semantically correct HTTP status codes (401 for authentication, 403 for authorization) in the global error handler to ensure proper security observability.
