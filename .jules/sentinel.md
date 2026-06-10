## 2024-05-24 - Improve authentication / authorization error responses
**Vulnerability:** The application was returning a generic 400 Bad Request error for authentication and authorization failures (invalid token format, token missing, or user ID not matching the requested resource).
**Learning:** Returning a generic error makes it harder to properly distinguish and audit unauthenticated vs unauthorized requests, which is crucial for rate limiting and anomaly detection.
**Prevention:** Ensure that the API correctly returns 401 Unauthorized for authentication issues (token parsing/missing) and 403 Forbidden for authorization issues (insufficient permissions or ID mismatches).
