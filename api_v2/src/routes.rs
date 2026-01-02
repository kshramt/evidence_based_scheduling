use crate::{db, errors, gen, AppState};
use axum::{extract::FromRequestParts, http::request::Parts, Json, RequestPartsExt};
use axum_extra::{headers::authorization::Bearer, TypedHeader};
use base64::Engine;
use serde_json::json;
use std::sync::Arc;
use tracing::instrument;
use utoipa_axum::{router::OpenApiRouter, routes};

pub fn api_router(state: Arc<AppState>) -> OpenApiRouter<Arc<AppState>> {
    OpenApiRouter::new()
        .routes(routes!(
            sys_health_get,
            fake_idp_users_post,
            fake_idp_login_id_token_post,
            users_post,
            users_user_id_clients_post,
            users_user_id_patches_batch_post,
            users_user_id_clients_client_id_pending_patches_get,
            users_user_id_clients_client_id_pending_patches_batch_delete,
            users_user_id_head_get,
            users_user_id_head_put
        ))
        .with_state(state)
}

impl<TState> FromRequestParts<TState> for gen::IdToken
where
    TState: Send + Sync,
{
    type Rejection = errors::ErrorStatus;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &TState,
    ) -> Result<Self, Self::Rejection> {
        let TypedHeader(axum_extra::headers::Authorization(bearer)) = parts
            .extract::<TypedHeader<axum_extra::headers::Authorization<Bearer>>>()
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

#[utoipa::path(
    get,
    path = "/sys/health",
    responses((status = 200, description = "System is healthy.", body = gen::SysHealthResponse)),
    security([])
)]
#[instrument(skip(state))]
pub async fn sys_health_get(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Result<Json<gen::SysHealthResponse>, errors::ErrorStatus> {
    let mut tx = state.pool.begin().await?;
    let _ = sqlx::query!("select 1 as x").fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(gen::SysHealthResponse {
        status: "ok".into(),
    }))
}

#[utoipa::path(
    post,
    path = "/fake_idp/users",
    request_body = gen::FakeIdpCreateUserRequest,
    responses((status = 201, description = "User created.", body = gen::FakeIdpCreateUserResponse)),
    security([])
)]
#[instrument(skip(state))]
pub async fn fake_idp_users_post(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(body): Json<gen::FakeIdpCreateUserRequest>,
) -> Result<(axum::http::StatusCode, Json<gen::FakeIdpCreateUserResponse>), errors::ErrorStatus> {
    let user_id = state.id_generator.lock()?.gen();
    let user_id = user_id.to_base62();
    let mut tx = state.pool.begin().await?;
    db::fake_idp_create_user(&mut tx, &user_id, &body.name).await?;
    tx.commit().await?;
    Ok((
        axum::http::StatusCode::CREATED,
        Json(gen::FakeIdpCreateUserResponse {
            id_token: gen::IdToken { user_id },
        }),
    ))
}

#[utoipa::path(
    post,
    path = "/fake_idp/login/id_token",
    request_body = gen::FakeIdpCreateUserRequest,
    responses((status = 200, description = "ID token created.", body = gen::FakeIdpCreateIdTokenResponse)),
    security([])
)]
#[instrument(skip(state))]
pub async fn fake_idp_login_id_token_post(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(body): Json<gen::FakeIdpCreateUserRequest>,
) -> Result<Json<gen::FakeIdpCreateIdTokenResponse>, errors::ErrorStatus> {
    let mut tx = state.pool.begin().await?;
    let user = db::fake_idp_get_user_by_name(&mut tx, &body.name).await?;
    Ok(Json(gen::FakeIdpCreateIdTokenResponse {
        id_token: gen::IdToken { user_id: user.id },
    }))
}

#[utoipa::path(
    post,
    path = "/users",
    request_body = gen::CreateUserRequest,
    responses((status = 201, description = "User created.", body = gen::CreateUserResponse))
)]
#[instrument(skip(state))]
pub async fn users_post(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    Json(_): Json<gen::CreateUserRequest>,
) -> Result<(axum::http::StatusCode, Json<gen::CreateUserResponse>), errors::ErrorStatus> {
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
            patch: json!([{ "op": "replace", "path": "", "value": { "data": null } }]),
            created_at: chrono::Utc::now(),
        }],
    )
    .await?;
    tx.commit().await?;
    Ok((
        axum::http::StatusCode::CREATED,
        Json(gen::CreateUserResponse {}),
    ))
}

#[utoipa::path(
    post,
    path = "/users/{user_id}/clients",
    params(("user_id" = String, Path, description = "User ID")),
    request_body = gen::CreateClientRequest,
    responses((status = 201, description = "Client created.", body = gen::CreateClientResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_clients_post(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<gen::UsersUserIdClientsPostPath>,
    Json(body): Json<gen::CreateClientRequest>,
) -> Result<(axum::http::StatusCode, Json<gen::CreateClientResponse>), errors::ErrorStatus> {
    let _ = &token.authorize(&path.user_id)?;
    let mut tx = state.pool.begin().await?;
    let client_id = create_client(&mut tx, &path.user_id, -1, &body.name).await?;
    tx.commit().await?;
    Ok((
        axum::http::StatusCode::CREATED,
        Json(gen::CreateClientResponse { client_id }),
    ))
}

#[utoipa::path(
    post,
    path = "/users/{user_id}/patches~batch",
    params(("user_id" = String, Path, description = "User ID")),
    request_body = gen::CreatePatchesRequest,
    responses((status = 201, description = "Patches pushed.", body = gen::CreatePatchesResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_patches_batch_post(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<gen::UsersUserIdPatchesBatchPostPath>,
    Json(body): Json<gen::CreatePatchesRequest>,
) -> Result<(axum::http::StatusCode, Json<gen::CreatePatchesResponse>), errors::ErrorStatus> {
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
    Ok((
        axum::http::StatusCode::CREATED,
        Json(gen::CreatePatchesResponse {}),
    ))
}

#[utoipa::path(
    get,
    path = "/users/{user_id}/clients/{client_id}/pending_patches",
    params(
        ("user_id" = String, Path, description = "User ID"),
        ("client_id" = i64, Path, description = "Client ID"),
        ("limit" = i64, Query, description = "Maximum patches to fetch")
    ),
    responses((status = 200, description = "Patches retrieved.", body = gen::GetPendingPatchesResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_clients_client_id_pending_patches_get(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<
        gen::UsersUserIdClientsClientIdPendingPatchesGetPath,
    >,
    axum::extract::Query(query): axum::extract::Query<
        gen::UsersUserIdClientsClientIdPendingPatchesGetQuery,
    >,
) -> Result<Json<gen::GetPendingPatchesResponse>, errors::ErrorStatus> {
    let _ = &token.authorize(&path.user_id)?;
    let mut tx = state.pool.begin().await?;
    let patches = db::get_pending_patches(&mut tx, &path.user_id, path.client_id, query.limit)
        .await?
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
        .collect();
    tx.commit().await?;
    Ok(Json(gen::GetPendingPatchesResponse { patches }))
}

#[utoipa::path(
    delete,
    path = "/users/{user_id}/clients/{client_id}/pending_patches~batch",
    params(
        ("user_id" = String, Path, description = "User ID"),
        ("client_id" = i64, Path, description = "Client ID")
    ),
    request_body = gen::DeletePendingPatchesRequest,
    responses((status = 200, description = "Patches deleted.", body = gen::DeletePendingPatchesResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_clients_client_id_pending_patches_batch_delete(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<
        gen::UsersUserIdClientsClientIdPendingPatchesBatchDeletePath,
    >,
    Json(body): Json<gen::DeletePendingPatchesRequest>,
) -> Result<Json<gen::DeletePendingPatchesResponse>, errors::ErrorStatus> {
    let _ = &token.authorize(&path.user_id)?;
    let mut tx = state.pool.begin().await?;
    let patch_keys: Vec<db::PatchKey> = body
        .patch_keys
        .iter()
        .map(|patch_key| db::PatchKey {
            client_id: patch_key.client_id,
            session_id: patch_key.session_id,
            patch_id: patch_key.patch_id,
        })
        .collect();
    db::delete_pending_patches(&mut tx, &path.user_id, path.client_id, &patch_keys).await?;
    tx.commit().await?;
    Ok(Json(gen::DeletePendingPatchesResponse {}))
}

#[utoipa::path(
    get,
    path = "/users/{user_id}/head",
    params(("user_id" = String, Path, description = "User ID")),
    responses((status = 200, description = "Head retrieved.", body = gen::GetHeadResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_head_get(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<gen::UsersUserIdHeadGetPath>,
) -> Result<Json<gen::GetHeadResponse>, errors::ErrorStatus> {
    let _ = &token.authorize(&path.user_id)?;
    let mut tx = state.pool.begin().await?;
    let head = db::get_head(&mut tx, &path.user_id).await?;
    tx.commit().await?;
    Ok(Json(gen::GetHeadResponse {
        client_id: head.head_client_id,
        session_id: head.head_session_id,
        patch_id: head.head_patch_id,
        created_at: head.created_at,
        name: head.name,
    }))
}

#[utoipa::path(
    put,
    path = "/users/{user_id}/head",
    params(("user_id" = String, Path, description = "User ID")),
    request_body = gen::UpdateHeadRequest,
    responses((status = 200, description = "Head has been set.", body = gen::UpdateHeadResponse))
)]
#[instrument(skip(state))]
pub async fn users_user_id_head_put(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    token: gen::IdToken,
    axum::extract::Path(path): axum::extract::Path<gen::UsersUserIdHeadPutPath>,
    Json(body): Json<gen::UpdateHeadRequest>,
) -> Result<Json<gen::UpdateHeadResponse>, errors::ErrorStatus> {
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
    Ok(Json(gen::UpdateHeadResponse { updated }))
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
