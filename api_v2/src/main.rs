use axum::{extract::State, Json};
use std::sync::{Arc, Mutex};

mod db;
mod errors;
mod gen;

struct ApiImpl;

#[async_trait::async_trait]
impl gen::Api for ApiImpl {
    type TError = errors::AppError;
    type TState = AppState;
    async fn create_user(
        State(state): State<Arc<AppState>>,
        Json(body): Json<gen::FakeIdpCreateUserRequest>,
    ) -> Result<Json<gen::FakeIdpCreateUserResponse>, errors::AppError> {
        let user_id = state.id_generator.lock().map_err(mutex_lock_error)?.gen();
        let user_id = user_id.to_base62();
        let mut tx = state.pool.begin().await?;
        db::fake_idp_create_user(&mut tx, &user_id, &body.name).await?;
        tx.commit().await?;
        Ok(Json(gen::FakeIdpCreateUserResponse {
            token: gen::Token { user_id },
        }))
    }
}

fn mutex_lock_error<T>(_: std::sync::PoisonError<std::sync::MutexGuard<T>>) -> errors::AppError {
    errors::AppError::new(anyhow::anyhow!("Mutex lock error"))
}

struct AppState {
    id_generator: Mutex<id_generator::SortableIdGenerator>,
    pool: sqlx::postgres::PgPool,
}
impl AppState {
    pub fn new(shard: u16, pool: sqlx::postgres::PgPool) -> Self {
        Self {
            id_generator: Mutex::new(id_generator::SortableIdGenerator::new(shard)),
            pool,
        }
    }
}

fn parse_u16(s: String) -> Option<u16> {
    s.parse::<u16>().ok()
}

fn get_server_port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(parse_u16)
        .unwrap_or(8080)
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
    let state = std::sync::Arc::new(AppState::new(get_shard(), get_pool().await));
    let app = axum::Router::new();
    let app = gen::register_app::<ApiImpl>(app);
    let app = app.with_state(state);

    let port = get_server_port();
    dbg!(port);
    axum::Server::bind(&format!("0.0.0.0:{}", port).parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
