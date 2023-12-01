#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct IdToken {
    pub user_id: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Patch {
    pub patch_key: PatchKey,
    pub parent_patch_key: PatchKey,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub patch: serde_json::Value,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct PatchKey {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SysHealthResponse {
    pub status: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateUserRequest {
    pub name: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateUserResponse {
    pub token: IdToken,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateIdTokenRequest {
    pub name: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateIdTokenResponse {
    pub token: IdToken,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateUserRequest {}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateUserResponse {}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateClientRequest {
    pub name: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateClientResponse {
    pub client_id: i64,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct GetPendingPatchesResponse {
    pub patches: Vec<Patch>,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeletePendingPatchesRequest {
    pub patch_keys: Vec<PatchKey>,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeletePendingPatchesResponse {}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreatePatchesRequest {
    pub patches: Vec<Patch>,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreatePatchesResponse {}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct GetHeadResponse {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub name: String,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct UpdateHeadRequest {
    pub patch_key: PatchKey,
    pub header_if_match: Option<PatchKey>,
}
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct UpdateHeadResponse {
    pub updated: bool,
}
#[derive(Debug)]
pub enum ApiV2SysHealthGet {
    S200(SysHealthResponse),
}
impl axum::response::IntoResponse for ApiV2SysHealthGet {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2SysHealthGet::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),
        }
        .into_response()
    }
}
#[derive(Debug)]
pub enum ApiV2FakeIdpUsersPost {
    S201(FakeIdpCreateUserResponse),
}
impl axum::response::IntoResponse for ApiV2FakeIdpUsersPost {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2FakeIdpUsersPost::S201(body) => {
                (axum::http::StatusCode::CREATED, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug)]
pub enum ApiV2FakeIdpLoginIdTokenPost {
    S200(FakeIdpCreateIdTokenResponse),
}
impl axum::response::IntoResponse for ApiV2FakeIdpLoginIdTokenPost {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2FakeIdpLoginIdTokenPost::S200(body) => {
                (axum::http::StatusCode::OK, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug)]
pub enum ApiV2UsersPost {
    S201(CreateUserResponse),
}
impl axum::response::IntoResponse for ApiV2UsersPost {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersPost::S201(body) => (axum::http::StatusCode::CREATED, axum::Json(body)),
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdClientsPostPath {
    pub user_id: String,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdClientsPost {
    S201(CreateClientResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdClientsPost {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdClientsPost::S201(body) => {
                (axum::http::StatusCode::CREATED, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdPatchesPostPath {
    pub user_id: String,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdPatchesPost {
    S201(CreatePatchesResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdPatchesPost {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdPatchesPost::S201(body) => {
                (axum::http::StatusCode::CREATED, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdClientsClientIdPendingPatchesGetPath {
    pub user_id: String,
    pub client_id: i64,
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdClientsClientIdPendingPatchesGetQuery {
    pub limit: i64,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdClientsClientIdPendingPatchesGet {
    S200(GetPendingPatchesResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdClientsClientIdPendingPatchesGet {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdClientsClientIdPendingPatchesGet::S200(body) => {
                (axum::http::StatusCode::OK, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDeletePath {
    pub user_id: String,
    pub client_id: i64,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete {
    S200(DeletePendingPatchesResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete::S200(body) => {
                (axum::http::StatusCode::OK, axum::Json(body))
            }
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdHeadGetPath {
    pub user_id: String,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdHeadGet {
    S200(GetHeadResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdHeadGet {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdHeadGet::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),
        }
        .into_response()
    }
}
#[derive(Debug, serde::Deserialize)]
pub struct ApiV2UsersUserIdHeadPutPath {
    pub user_id: String,
}
#[derive(Debug)]
pub enum ApiV2UsersUserIdHeadPut {
    S200(UpdateHeadResponse),
}
impl axum::response::IntoResponse for ApiV2UsersUserIdHeadPut {
    fn into_response(self) -> axum::response::Response {
        match self {
            ApiV2UsersUserIdHeadPut::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),
        }
        .into_response()
    }
}
#[async_trait::async_trait]
pub trait Api {
    type TError: axum::response::IntoResponse;
    type TState: Clone + Send + Sync;
    type TToken: axum::extract::FromRequestParts<Self::TState, Rejection = Self::TError> + Send;

    async fn api_v2_sys_health_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
    ) -> Result<ApiV2SysHealthGet, Self::TError>;
    async fn api_v2_fake_idp_users_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        axum::extract::Json(body): axum::extract::Json<FakeIdpCreateUserRequest>,
    ) -> Result<ApiV2FakeIdpUsersPost, Self::TError>;
    async fn api_v2_fake_idp_login_id_token_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        axum::extract::Json(body): axum::extract::Json<FakeIdpCreateUserRequest>,
    ) -> Result<ApiV2FakeIdpLoginIdTokenPost, Self::TError>;
    async fn api_v2_users_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Json(body): axum::extract::Json<CreateUserRequest>,
    ) -> Result<ApiV2UsersPost, Self::TError>;
    async fn api_v2_users_user_id_clients_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<ApiV2UsersUserIdClientsPostPath>,
        axum::extract::Json(body): axum::extract::Json<CreateClientRequest>,
    ) -> Result<ApiV2UsersUserIdClientsPost, Self::TError>;
    async fn api_v2_users_user_id_patches_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<ApiV2UsersUserIdPatchesPostPath>,
        axum::extract::Json(body): axum::extract::Json<CreatePatchesRequest>,
    ) -> Result<ApiV2UsersUserIdPatchesPost, Self::TError>;
    async fn api_v2_users_user_id_clients_client_id_pending_patches_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<
            ApiV2UsersUserIdClientsClientIdPendingPatchesGetPath,
        >,
        axum::extract::Query(query): axum::extract::Query<
            ApiV2UsersUserIdClientsClientIdPendingPatchesGetQuery,
        >,
    ) -> Result<ApiV2UsersUserIdClientsClientIdPendingPatchesGet, Self::TError>;
    async fn api_v2_users_user_id_clients_client_id_pending_patches_batch_delete(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<
            ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDeletePath,
        >,
        axum::extract::Json(body): axum::extract::Json<DeletePendingPatchesRequest>,
    ) -> Result<ApiV2UsersUserIdClientsClientIdPendingPatchesBatchDelete, Self::TError>;
    async fn api_v2_users_user_id_head_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<ApiV2UsersUserIdHeadGetPath>,
    ) -> Result<ApiV2UsersUserIdHeadGet, Self::TError>;
    async fn api_v2_users_user_id_head_put(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<ApiV2UsersUserIdHeadPutPath>,
        axum::extract::Json(body): axum::extract::Json<UpdateHeadRequest>,
    ) -> Result<ApiV2UsersUserIdHeadPut, Self::TError>;
}
pub fn register_app<TApi: Api + 'static>(
    app: axum::Router<TApi::TState>,
) -> axum::Router<TApi::TState> {
    let app = app.route(
        "/api/v2/sys/health",
        axum::routing::get(TApi::api_v2_sys_health_get),
    );
    let app = app.route(
        "/api/v2/fake_idp/users",
        axum::routing::post(TApi::api_v2_fake_idp_users_post),
    );
    let app = app.route(
        "/api/v2/fake_idp/login/id_token",
        axum::routing::post(TApi::api_v2_fake_idp_login_id_token_post),
    );
    let app = app.route(
        "/api/v2/users",
        axum::routing::post(TApi::api_v2_users_post),
    );
    let app = app.route(
        "/api/v2/users/:user_id/clients",
        axum::routing::post(TApi::api_v2_users_user_id_clients_post),
    );
    let app = app.route(
        "/api/v2/users/:user_id/patches",
        axum::routing::post(TApi::api_v2_users_user_id_patches_post),
    );
    let app = app.route(
        "/api/v2/users/:user_id/clients/:client_id/pending_patches",
        axum::routing::get(TApi::api_v2_users_user_id_clients_client_id_pending_patches_get),
    );
    let app = app.route(
        "/api/v2/users/:user_id/clients/:client_id/pending_patches:batch",
        axum::routing::delete(
            TApi::api_v2_users_user_id_clients_client_id_pending_patches_batch_delete,
        ),
    );
    let app = app.route(
        "/api/v2/users/:user_id/head",
        axum::routing::get(TApi::api_v2_users_user_id_head_get),
    );
    app.route(
        "/api/v2/users/:user_id/head",
        axum::routing::put(TApi::api_v2_users_user_id_head_put),
    )
}
