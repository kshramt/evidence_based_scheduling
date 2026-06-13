## 2024-07-26 - Accurate HTTP Status Codes for Auth Failures
**Vulnerability:** Inaccurate HTTP status codes for authentication/authorization failures.
**Learning:** The application was returning a generic 400 Bad Request for invalid tokens and missing permissions. This obscures the nature of the security failure from clients and monitoring systems, making it difficult to detect brute-force token guessing or privilege escalation attempts.
**Prevention:** Always distinguish between 401 Unauthorized (unauthenticated/invalid token) and 403 Forbidden (authenticated but lacking permissions) instead of falling back to generic 400 errors.
