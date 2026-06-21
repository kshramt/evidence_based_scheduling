## 2024-06-21 - Semantic Error Status Codes for Auth
**Vulnerability:** The application was previously returning a generic 400 Bad Request for both token extraction failures (unauthenticated) and IDOR authorization logic failures (forbidden), losing critical semantic security context.
**Learning:** Returning 400 Bad Request instead of 401/403 hides security-relevant context, complicating security auditing and rate-limiting responses based on unauthorized access attempts.
**Prevention:** Use specific semantic HTTP statuses (`StatusCode::UNAUTHORIZED` and `StatusCode::FORBIDDEN`) for missing/invalid token extraction and authorization logic failures respectively.
