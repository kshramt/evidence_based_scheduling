mod gen;

struct ApiImpl;

#[async_trait::async_trait]
impl gen::Api for ApiImpl {
    async fn hello() -> String {
        "Hello, World!".into()
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

#[tokio::main]
async fn main() {
    // build our application with a single route
    let app = axum::Router::new();
    let app = gen::register_app::<ApiImpl>(app);

    axum::Server::bind(&format!("0.0.0.0:{}", get_server_port()).parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
