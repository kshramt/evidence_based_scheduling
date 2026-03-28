use super::*;
use axum::{body::Body, http::Request};
use tower::ServiceExt;

#[tokio::test]
async fn test_security_headers() {
    let pool = sqlx::postgres::PgPoolOptions::new()
        .connect_lazy("postgres://invalid:invalid@localhost/invalid")
        .unwrap();
    let state = std::sync::Arc::new(AppState::new(0, pool));
    let app = axum::Router::new();
    let app = gen::register_app::<ApiImpl>(app);
    let app = app.with_state(state);
    let app = app
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(axum::extract::DefaultBodyLimit::max(40 * 1024 * 1024))
        .layer(tower_http::set_header::SetResponseHeaderLayer::appending(
            axum::http::header::CONTENT_SECURITY_POLICY,
            axum::http::HeaderValue::from_static(
                "default-src 'none'; frame-ancestors 'none'; sandbox",
            ),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::appending(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            axum::http::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::appending(
            axum::http::header::X_FRAME_OPTIONS,
            axum::http::HeaderValue::from_static("DENY"),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::appending(
            axum::http::header::X_CONTENT_TYPE_OPTIONS,
            axum::http::HeaderValue::from_static("nosniff"),
        ))
        .layer(tower_http::set_header::SetResponseHeaderLayer::appending(
            axum::http::header::HeaderName::from_static("referrer-policy"),
            axum::http::HeaderValue::from_static("no-referrer"),
        ));

    let request = Request::builder()
        .uri("/api/v2/not-found") // Hit 404 to avoid DB ops
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();

    assert_eq!(
        response.headers().get("content-security-policy").unwrap(),
        "default-src 'none'; frame-ancestors 'none'; sandbox"
    );
    assert_eq!(
        response.headers().get("strict-transport-security").unwrap(),
        "max-age=31536000; includeSubDomains"
    );
    assert_eq!(response.headers().get("x-frame-options").unwrap(), "DENY");
    assert_eq!(
        response.headers().get("x-content-type-options").unwrap(),
        "nosniff"
    );
    assert_eq!(
        response.headers().get("referrer-policy").unwrap(),
        "no-referrer"
    );
}
