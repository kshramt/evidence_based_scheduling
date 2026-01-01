pub mod db;
pub mod errors;
pub mod gen;
pub mod openapi;
pub mod routes;

use std::sync::Mutex;

#[derive(Debug)]
pub struct AppState {
    pub(crate) id_generator: Mutex<id_generator::SortableIdGenerator>,
    pub(crate) pool: sqlx::postgres::PgPool,
}

impl AppState {
    pub fn new(shard: u16, pool: sqlx::postgres::PgPool) -> Self {
        Self {
            id_generator: Mutex::new(id_generator::SortableIdGenerator::new(shard)),
            pool,
        }
    }
}

pub use openapi::ApiDoc;
pub use routes::api_router;
