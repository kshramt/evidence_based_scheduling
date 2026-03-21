use axum::http::{header, Request};
use axum::{body::Body, routing::get, Router};
use tower::ServiceExt;
use tower_http::set_header::SetResponseHeaderLayer; // for `oneshot`

#[tokio::test]
async fn test_headers() {
    let app: Router<()> = Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .layer(SetResponseHeaderLayer::overriding(
            header::CONTENT_SECURITY_POLICY,
            header::HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'; sandbox"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            header::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            header::HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            header::HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            header::HeaderValue::from_static("no-referrer"),
        ));

    let response = app
        .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
        .await
        .unwrap();

    let headers = response.headers();

    assert_eq!(
        headers.get(header::CONTENT_SECURITY_POLICY).unwrap(),
        "default-src 'none'; frame-ancestors 'none'; sandbox"
    );
    assert_eq!(
        headers.get(header::STRICT_TRANSPORT_SECURITY).unwrap(),
        "max-age=31536000; includeSubDomains"
    );
    assert_eq!(headers.get(header::X_FRAME_OPTIONS).unwrap(), "DENY");
    assert_eq!(
        headers.get(header::X_CONTENT_TYPE_OPTIONS).unwrap(),
        "nosniff"
    );
    assert_eq!(headers.get(header::REFERRER_POLICY).unwrap(), "no-referrer");
}
