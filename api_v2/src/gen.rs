#[derive(serde::Serialize)]
pub struct Token {
    pub user_id: String,
}

#[derive(serde::Deserialize)]
pub struct FakeIdpCreateUserRequest {
    pub name: String,
}

#[derive(serde::Serialize)]
pub struct FakeIdpCreateUserResponse {
    pub token: Token,
}

#[async_trait::async_trait]
pub trait Api<TError: axum::response::IntoResponse, TState> {
    async fn create_user(
        axum::extract::State(state): axum::extract::State<std::sync::Arc<TState>>,
        axum::Json(body): axum::Json<FakeIdpCreateUserRequest>,
    ) -> Result<axum::Json<FakeIdpCreateUserResponse>, TError>;
}

pub fn register_app<
    TApi: 'static + Api<TError, TState>,
    TError: 'static + axum::response::IntoResponse,
    TState: 'static + Send + Sync,
>(
    app: axum::Router<std::sync::Arc<TState>>,
) -> axum::Router<std::sync::Arc<TState>> {
    app.route("/api/v2/users/", axum::routing::post(TApi::create_user))
}
