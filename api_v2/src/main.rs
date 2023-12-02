use axum::{
    extract::{FromRequestParts, Path, Query, State},
    http::request::Parts,
    Json, RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use base64::Engine;
use serde_json::json;
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};

mod db;
mod errors;
mod gen;

struct ApiImpl;

#[async_trait::async_trait]
impl<TState> FromRequestParts<TState> for gen::IdToken
where
    TState: Send + Sync,
{
    type Rejection = errors::ErrorStatus;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &TState,
    ) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| errors::ErrorStatus::Status400)?;
        Self::from_base64(bearer.token())
    }
}

impl gen::IdToken {
    pub fn from_base64(s: &str) -> Result<Self, errors::ErrorStatus> {
        let s = base64::engine::general_purpose::STANDARD
            .decode(s)
            .map_err(|_| errors::ErrorStatus::Status400)?;
        serde_json::from_slice(&s).map_err(|_| errors::ErrorStatus::Status400)
    }

    pub fn authorize(&self, user_id: &str) -> Result<(), errors::ErrorStatus> {
        if self.user_id == user_id {
            Ok(())
        } else {
            Err(errors::ErrorStatus::Status400)
        }
    }
}

#[async_trait::async_trait]
impl gen::Api for ApiImpl {
    type TError = errors::ErrorStatus;
    type TState = Arc<AppState>;
    type TToken = gen::IdToken;

    async fn api_v2_sys_health_get(
        State(state): State<Arc<AppState>>,
    ) -> Result<gen::ApiV2SysHealthGet, errors::ErrorStatus> {
        let mut tx = state.pool.begin().await?;
        // https://github.com/launchbadge/sqlx/issues/702
        let _ = sqlx::query!("select 1 as x").fetch_one(&mut *tx).await?;
        tx.commit().await?;
        Ok(gen::ApiV2SysHealthGet::S200(gen::SysHealthResponse {
            status: "ok".into(),
        }))
    }

    async fn api_v2_fake_idp_users_post(
        State(state): State<Arc<AppState>>,
        Json(body): Json<gen::FakeIdpCreateUserRequest>,
    ) -> Result<gen::ApiV2FakeIdpUsersPost, errors::ErrorStatus> {
        let user_id = state.id_generator.lock()?.gen();
        let user_id = user_id.to_base62();
        let mut tx = state.pool.begin().await?;
        db::fake_idp_create_user(&mut tx, &user_id, &body.name).await?;
        tx.commit().await?;
        Ok(gen::ApiV2FakeIdpUsersPost::S201(
            gen::FakeIdpCreateUserResponse {
                token: gen::IdToken { user_id },
            },
        ))
    }

    async fn api_v2_fake_idp_login_id_token_post(
        State(state): State<Arc<AppState>>,
        Json(body): Json<gen::FakeIdpCreateUserRequest>,
    ) -> Result<gen::ApiV2FakeIdpLoginIdTokenPost, errors::ErrorStatus> {
        let mut tx = state.pool.begin().await?;
        let user = db::fake_idp_get_user_by_name(&mut tx, &body.name).await?;
        Ok(gen::ApiV2FakeIdpLoginIdTokenPost::S200(
            gen::FakeIdpCreateIdTokenResponse {
                token: gen::IdToken { user_id: user.id },
            },
        ))
    }

    /// 1. Create a new user.
    /// 2. Create a new seq for the user.
    /// 3. Create the system clietn for the user.
    /// 4. Create the initial patch for the user.
    async fn api_v2_users_post(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Json(_): Json<gen::CreateUserRequest>,
    ) -> Result<gen::ApiV2UsersPost, errors::ErrorStatus> {
        let root_client_id = 0;
        let root_session_id = 0;
        let root_patch_id = 0;
        let mut tx = state.pool.begin().await?;
        db::raw_create_user(
            &mut tx,
            &token.user_id,
            root_client_id,
            root_session_id,
            root_patch_id,
        )
        .await?;
        db::create_seq(&mut tx, &token.user_id).await?;
        create_client(&mut tx, &token.user_id, root_client_id, "System").await?;
        db::create_patches_for_user(
            &mut tx,
            &token.user_id,
            &[db::Patch {
                client_id: root_client_id,
                session_id: root_session_id,
                patch_id: root_patch_id,
                parent_client_id: root_client_id,
                parent_session_id: root_session_id,
                parent_patch_id: root_patch_id,
                patch: json!([{"op": "replace", "path": "", "value": {"data": null}}]),
                created_at: chrono::Utc::now(),
            }],
        )
        .await?;
        tx.commit().await?;
        Ok(gen::ApiV2UsersPost::S201(gen::CreateUserResponse {}))
    }

    async fn api_v2_users_user_id_clients_post(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdClientsPostPath>,
        Json(body): Json<gen::CreateClientRequest>,
    ) -> Result<gen::ApiV2UsersUserIdClientsPost, errors::ErrorStatus> {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let client_id = create_client(&mut tx, &path.user_id, -1, &body.name).await?;
        tx.commit().await?;
        Ok(gen::ApiV2UsersUserIdClientsPost::S201(
            gen::CreateClientResponse { client_id },
        ))
    }

    async fn api_v2_users_user_id_patches_batch_post(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdPatchesBatchPostPath>,
        Json(body): Json<gen::CreatePatchesRequest>,
    ) -> Result<gen::ApiV2UsersUserIdPatchesBatchPost, errors::ErrorStatus> {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let patches: Vec<db::Patch> = body
            .patches
            .into_iter()
            .map(|patch| db::Patch {
                client_id: patch.patch_key.client_id,
                session_id: patch.patch_key.session_id,
                patch_id: patch.patch_key.patch_id,
                parent_client_id: patch.parent_patch_key.client_id,
                parent_session_id: patch.parent_patch_key.session_id,
                parent_patch_id: patch.parent_patch_key.patch_id,
                patch: patch.patch,
                created_at: patch.created_at,
            })
            .collect();
        db::create_patches_for_user(&mut tx, &path.user_id, &patches).await?;
        tx.commit().await?;
        Ok(gen::ApiV2UsersUserIdPatchesBatchPost::S201(
            gen::CreatePatchesResponse {},
        ))
    }

    async fn api_v2_users_user_id_clients_client_id_pending_patches_get(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdClientsClientIdPendingPatchesGetPath>,
        Query(query): Query<gen::ApiV2UsersUserIdClientsClientIdPendingPatchesGetQuery>,
    ) -> Result<gen::ApiV2UsersUserIdClientsClientIdPendingPatchesGet, errors::ErrorStatus> {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let patches =
            db::get_pending_patches(&mut tx, &path.user_id, path.client_id, query.limit).await?;
        tx.commit().await?;
        Ok(gen::ApiV2UsersUserIdClientsClientIdPendingPatchesGet::S200(
            gen::GetPendingPatchesResponse {
                patches: patches
                    .into_iter()
                    .map(|patch| gen::Patch {
                        patch_key: gen::PatchKey {
                            client_id: patch.client_id,
                            session_id: patch.session_id,
                            patch_id: patch.patch_id,
                        },
                        parent_patch_key: gen::PatchKey {
                            client_id: patch.parent_client_id,
                            session_id: patch.parent_session_id,
                            patch_id: patch.parent_patch_id,
                        },
                        patch: patch.patch,
                        created_at: patch.created_at,
                    })
                    .collect(),
            },
        ))
    }

    async fn api_v2_users_user_id_clients_client_id_pending_patches_batch_delete(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDeletePath>,
        Json(body): Json<gen::DeletePendingPatchesRequest>,
    ) -> Result<gen::ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete, errors::ErrorStatus>
    {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let patch_keys: Vec<db::PatchKey> = body
            .patch_keys
            .into_iter()
            .map(|patch_key| db::PatchKey {
                client_id: patch_key.client_id,
                session_id: patch_key.session_id,
                patch_id: patch_key.patch_id,
            })
            .collect();
        db::delete_pending_patches(&mut tx, &path.user_id, path.client_id, &patch_keys).await?;
        tx.commit().await?;
        Ok(
            gen::ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete::S200(
                gen::DeletePendingPatchesResponse {},
            ),
        )
    }

    async fn api_v2_users_user_id_head_get(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdHeadGetPath>,
    ) -> Result<gen::ApiV2UsersUserIdHeadGet, errors::ErrorStatus> {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let head = db::get_head(&mut tx, &path.user_id).await?;
        tx.commit().await?;
        Ok(gen::ApiV2UsersUserIdHeadGet::S200(gen::GetHeadResponse {
            client_id: head.head_client_id,
            session_id: head.head_session_id,
            patch_id: head.head_patch_id,
            created_at: head.created_at,
            name: head.name,
        }))
    }

    async fn api_v2_users_user_id_head_put(
        State(state): State<Arc<AppState>>,
        token: gen::IdToken,
        Path(path): Path<gen::ApiV2UsersUserIdHeadPutPath>,
        Json(body): Json<gen::UpdateHeadRequest>,
    ) -> Result<gen::ApiV2UsersUserIdHeadPut, errors::ErrorStatus> {
        let _ = &token.authorize(&path.user_id)?;
        let mut tx = state.pool.begin().await?;
        let updated = match body.header_if_match {
            Some(prev_patch_key) => {
                let result = db::update_head_if_not_modified(
                    &mut tx,
                    &path.user_id,
                    body.patch_key.client_id,
                    body.patch_key.session_id,
                    body.patch_key.patch_id,
                    prev_patch_key.client_id,
                    prev_patch_key.session_id,
                    prev_patch_key.patch_id,
                )
                .await?;
                0 < result.rows_affected()
            }
            None => {
                db::update_head(
                    &mut tx,
                    &path.user_id,
                    body.patch_key.client_id,
                    body.patch_key.session_id,
                    body.patch_key.patch_id,
                )
                .await?;
                true
            }
        };
        tx.commit().await?;
        Ok(gen::ApiV2UsersUserIdHeadPut::S200(
            gen::UpdateHeadResponse { updated },
        ))
    }
}

async fn create_client(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    name: &str,
) -> sqlx::Result<i64> {
    let mut client_id = client_id;
    if client_id == -1 {
        client_id = db::update_last_seq_value(tx, user_id, 1).await?.last_value;
    }
    db::create_client(tx, user_id, client_id, name).await?;
    Ok(client_id)
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
    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port)))
        .await
        .unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}
