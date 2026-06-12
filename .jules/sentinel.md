## 2024-06-12 - Improper HTTP Error Status Codes for Authorization
**Vulnerability:** The application's authentication and authorization handlers returned a generic `400 Bad Request` (`ErrorStatus::Status400`) instead of semantic HTTP error status codes like `401 Unauthorized` or `403 Forbidden`.
**Learning:** Returning a generic `400 Bad Request` can obscure authentication or authorization failures from clients and API consumers. This makes it difficult to differentiate client input errors from actual access control violations in monitoring systems, potentially hampering intrusion detection mechanisms.
**Prevention:** Ensure custom error mapping layers translate authentication missing/invalid errors to `401 Unauthorized` and failed permission checks to `403 Forbidden` explicitly.
