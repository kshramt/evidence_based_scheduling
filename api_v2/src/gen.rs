#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct IdToken {
    pub user_id: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Patch {
    pub patch_key: PatchKey,
    pub parent_patch_key: PatchKey,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub patch: serde_json::Value,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct PatchKey {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct SysHealthResponse {
    pub status: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateUserRequest {
    pub name: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateUserResponse {
    pub id_token: IdToken,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateIdTokenRequest {
    pub name: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct FakeIdpCreateIdTokenResponse {
    pub id_token: IdToken,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateUserRequest {
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateUserResponse {
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateClientRequest {
    pub name: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreateClientResponse {
    pub client_id: i64,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct GetPendingPatchesResponse {
    pub patches: Vec<Patch>,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeletePendingPatchesRequest {
    pub patch_keys: Vec<PatchKey>,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct DeletePendingPatchesResponse {
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreatePatchesRequest {
    pub patches: Vec<Patch>,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct CreatePatchesResponse {
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct GetHeadResponse {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub name: String,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct UpdateHeadRequest {
    pub patch_key: PatchKey,
    pub header_if_match: Option<PatchKey>,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct UpdateHeadResponse {
    pub updated: bool,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum SysHealthGet {
    S200(SysHealthResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for SysHealthGet {
    fn into_response(self) -> axum::response::Response {
        match self  {
            SysHealthGet::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum FakeIdpUsersPost {
    S201(FakeIdpCreateUserResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for FakeIdpUsersPost {
    fn into_response(self) -> axum::response::Response {
        match self  {
            FakeIdpUsersPost::S201(body) => (axum::http::StatusCode::CREATED, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum FakeIdpLoginIdTokenPost {
    S200(FakeIdpCreateIdTokenResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for FakeIdpLoginIdTokenPost {
    fn into_response(self) -> axum::response::Response {
        match self  {
            FakeIdpLoginIdTokenPost::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersPost {
    S201(CreateUserResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersPost {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersPost::S201(body) => (axum::http::StatusCode::CREATED, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdClientsPostPath {
    pub user_id: String,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdClientsPost {
    S201(CreateClientResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdClientsPost {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdClientsPost::S201(body) => (axum::http::StatusCode::CREATED, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdPatchesBatchPostPath {
    pub user_id: String,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdPatchesBatchPost {
    S201(CreatePatchesResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdPatchesBatchPost {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdPatchesBatchPost::S201(body) => (axum::http::StatusCode::CREATED, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesGetPath {
    pub user_id: String,
    pub client_id: i64,
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesGetQuery {
    pub limit: i64,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdClientsClientIdPendingPatchesGet {
    S200(GetPendingPatchesResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdClientsClientIdPendingPatchesGet {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdClientsClientIdPendingPatchesGet::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesBatchDeletePath {
    pub user_id: String,
    pub client_id: i64,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdClientsClientIdPendingPatchesBatchDelete {
    S200(DeletePendingPatchesResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdClientsClientIdPendingPatchesBatchDelete {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdClientsClientIdPendingPatchesBatchDelete::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdHeadGetPath {
    pub user_id: String,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdHeadGet {
    S200(GetHeadResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdHeadGet {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdHeadGet::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[derive(Debug, serde::Deserialize)]
pub struct UsersUserIdHeadPutPath {
    pub user_id: String,
}
#[rustfmt::skip]
#[derive(Debug)]
pub enum UsersUserIdHeadPut {
    S200(UpdateHeadResponse),

}
#[rustfmt::skip]
impl axum::response::IntoResponse for UsersUserIdHeadPut {
    fn into_response(self) -> axum::response::Response {
        match self  {
            UsersUserIdHeadPut::S200(body) => (axum::http::StatusCode::OK, axum::Json(body)),

        }.into_response()
    }
}
#[rustfmt::skip]
#[async_trait::async_trait]
pub trait Api {
    type TError: axum::response::IntoResponse;
    type TState: Clone + Send + Sync;
    type TToken: axum::extract::FromRequestParts<Self::TState, Rejection = Self::TError> + Send;


    async fn sys_health_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
    ) -> Result<SysHealthGet, Self::TError>;
    async fn fake_idp_users_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        axum::extract::Json(body): axum::extract::Json<FakeIdpCreateUserRequest>,
    ) -> Result<FakeIdpUsersPost, Self::TError>;
    async fn fake_idp_login_id_token_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        axum::extract::Json(body): axum::extract::Json<FakeIdpCreateUserRequest>,
    ) -> Result<FakeIdpLoginIdTokenPost, Self::TError>;
    async fn users_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Json(body): axum::extract::Json<CreateUserRequest>,
    ) -> Result<UsersPost, Self::TError>;
    async fn users_user_id_clients_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdClientsPostPath>,
        axum::extract::Json(body): axum::extract::Json<CreateClientRequest>,
    ) -> Result<UsersUserIdClientsPost, Self::TError>;
    async fn users_user_id_patches_batch_post(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdPatchesBatchPostPath>,
        axum::extract::Json(body): axum::extract::Json<CreatePatchesRequest>,
    ) -> Result<UsersUserIdPatchesBatchPost, Self::TError>;
    async fn users_user_id_clients_client_id_pending_patches_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdClientsClientIdPendingPatchesGetPath>,
        axum::extract::Query(query): axum::extract::Query<UsersUserIdClientsClientIdPendingPatchesGetQuery>,
    ) -> Result<UsersUserIdClientsClientIdPendingPatchesGet, Self::TError>;
    async fn users_user_id_clients_client_id_pending_patches_batch_delete(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdClientsClientIdPendingPatchesBatchDeletePath>,
        axum::extract::Json(body): axum::extract::Json<DeletePendingPatchesRequest>,
    ) -> Result<UsersUserIdClientsClientIdPendingPatchesBatchDelete, Self::TError>;
    async fn users_user_id_head_get(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdHeadGetPath>,
    ) -> Result<UsersUserIdHeadGet, Self::TError>;
    async fn users_user_id_head_put(
        axum::extract::State(state): axum::extract::State<Self::TState>,
        token: Self::TToken,
        axum::extract::Path(path): axum::extract::Path<UsersUserIdHeadPutPath>,
        axum::extract::Json(body): axum::extract::Json<UpdateHeadRequest>,
    ) -> Result<UsersUserIdHeadPut, Self::TError>;
}
#[rustfmt::skip]
pub fn register_app<TApi: Api + 'static>(
    app: axum::Router<TApi::TState>,
) -> axum::Router<TApi::TState> {
    let app = app.route("/sys/health", axum::routing::get(TApi::sys_health_get));
    let app = app.route("/fake_idp/users", axum::routing::post(TApi::fake_idp_users_post));
    let app = app.route("/fake_idp/login/id_token", axum::routing::post(TApi::fake_idp_login_id_token_post));
    let app = app.route("/users", axum::routing::post(TApi::users_post));
    let app = app.route("/users/:user_id/clients", axum::routing::post(TApi::users_user_id_clients_post));
    let app = app.route("/users/:user_id/patches~batch", axum::routing::post(TApi::users_user_id_patches_batch_post));
    let app = app.route("/users/:user_id/clients/:client_id/pending_patches", axum::routing::get(TApi::users_user_id_clients_client_id_pending_patches_get));
    let app = app.route("/users/:user_id/clients/:client_id/pending_patches~batch", axum::routing::delete(TApi::users_user_id_clients_client_id_pending_patches_batch_delete));
    let app = app.route("/users/:user_id/head", axum::routing::get(TApi::users_user_id_head_get));
    let app = app.route("/users/:user_id/head", axum::routing::put(TApi::users_user_id_head_put));
    axum::Router::new().nest("/api/v2", app)
}
