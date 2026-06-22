## 2024-06-22 - Distinguish 401 Unauthorized and 403 Forbidden Error Types
**Vulnerability:** API requests were returning a generic HTTP 400 Bad Request error code on invalid token parsing and failed authorization evaluations.
**Learning:** Returning appropriate authorization errors is critical for security systems or network monitors tracking malicious activities or authentication issues. Failing to map domain-specific logic to proper HTTP semantics can disguise abuse attempts.
**Prevention:** During endpoint design, implement strict mappings between validation steps (like decoding a token or checking a principal's privileges) and matching HTTP status codes (e.g., 401 for unauthorized, 403 for forbidden) to ensure clear signaling of security concerns.
