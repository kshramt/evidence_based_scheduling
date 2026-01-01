use utoipa::OpenApi;

fn main() {
    let openapi = api_v2::ApiDoc::openapi();
    let yaml = openapi.to_yaml().expect("failed to render openapi spec");
    println!("{}", yaml);
}
