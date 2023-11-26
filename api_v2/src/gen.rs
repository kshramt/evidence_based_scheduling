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
pub trait Api {
    type TError: axum::response::IntoResponse;
    type TState;

    async fn create_user(
        axum::extract::State(state): axum::extract::State<std::sync::Arc<Self::TState>>,
        axum::Json(body): axum::Json<FakeIdpCreateUserRequest>,
    ) -> Result<axum::Json<FakeIdpCreateUserResponse>, Self::TError>;
}

pub fn register_app<TApi>(
    app: axum::Router<std::sync::Arc<TApi::TState>>,
) -> axum::Router<std::sync::Arc<TApi::TState>>
where
    TApi: 'static + Api,
    TApi::TState: Send + Sync,
{
    app.route("/api/v2/users/", axum::routing::post(TApi::create_user))
}
