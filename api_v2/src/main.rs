use api_v2::{api_router, ApiDoc, AppState};
use std::{net::SocketAddr, sync::Arc};
use tracing::info;
use tracing_subscriber::EnvFilter;
use utoipa::OpenApi;
use utoipa_axum::router::OpenApiRouter;

fn parse_u16(s: String) -> Option<u16> {
    s.parse::<u16>().ok()
}

fn get_server_port() -> u16 {
    std::env::var("PORT").ok().and_then(parse_u16).unwrap_or(8080)
}

fn get_database_url() -> String {
    std::env::var("DATABASE_URL").expect("DATABASE_URL is not set")
}

fn get_shard() -> u16 {
    std::env::var("SHARD").ok().and_then(parse_u16).unwrap_or(0)
}

async fn get_pool() -> sqlx::postgres::PgPool {
    sqlx::postgres::PgPoolOptions::new()
        .max_connections(100)
        .connect(&get_database_url())
        .await
        .unwrap()
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    let state = Arc::new(AppState::new(get_shard(), get_pool().await));

    let app = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .nest("/api/v2", api_router(state.clone()))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(axum::extract::DefaultBodyLimit::max(40 * 1024 * 1024));

    let app: axum::Router<_> = app.with_state(state).into();

    let port = get_server_port();
    info!(port = ?port);
    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port)))
        .await
        .unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
