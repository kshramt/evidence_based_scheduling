#[async_trait::async_trait]
pub trait Api {
    async fn hello() -> String;
}

pub fn register_app<T: Api + 'static>(app: axum::Router) -> axum::Router {
    app.route("/hello", axum::routing::get(T::hello))
}
