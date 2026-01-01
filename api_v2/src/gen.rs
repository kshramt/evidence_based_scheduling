use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct IdToken {
    pub user_id: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct Patch {
    pub patch_key: PatchKey,
    pub parent_patch_key: PatchKey,
    #[schema(format = DateTime)]
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Any JSON value.
    pub patch: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct PatchKey {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct SysHealthResponse {
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct FakeIdpCreateUserRequest {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct FakeIdpCreateUserResponse {
    pub id_token: IdToken,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct FakeIdpCreateIdTokenRequest {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct FakeIdpCreateIdTokenResponse {
    pub id_token: IdToken,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateUserRequest {}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateUserResponse {}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateClientRequest {
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreateClientResponse {
    pub client_id: i64,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct GetPendingPatchesResponse {
    pub patches: Vec<Patch>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct DeletePendingPatchesRequest {
    pub patch_keys: Vec<PatchKey>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct DeletePendingPatchesResponse {}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreatePatchesRequest {
    pub patches: Vec<Patch>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct CreatePatchesResponse {}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct GetHeadResponse {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
    #[schema(format = DateTime)]
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateHeadRequest {
    pub patch_key: PatchKey,
    pub header_if_match: Option<PatchKey>,
}

#[derive(Debug, Deserialize, Serialize, ToSchema)]
pub struct UpdateHeadResponse {
    pub updated: bool,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdClientsPostPath {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdPatchesBatchPostPath {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesGetPath {
    pub user_id: String,
    pub client_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesGetQuery {
    pub limit: i64,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdClientsClientIdPendingPatchesBatchDeletePath {
    pub user_id: String,
    pub client_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdHeadGetPath {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UsersUserIdHeadPutPath {
    pub user_id: String,
}
