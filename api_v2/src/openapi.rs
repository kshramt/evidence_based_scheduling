use crate::{gen, routes};
use utoipa::{Modify, OpenApi};
use utoipa::openapi::security::{HttpAuthScheme, HttpBuilder, SecurityScheme};

#[derive(OpenApi)]
#[openapi(
    info(title = "API V2", version = "2.0.0"),
    paths(
        routes::sys_health_get,
        routes::fake_idp_users_post,
        routes::fake_idp_login_id_token_post,
        routes::users_post,
        routes::users_user_id_clients_post,
        routes::users_user_id_patches_batch_post,
        routes::users_user_id_clients_client_id_pending_patches_get,
        routes::users_user_id_clients_client_id_pending_patches_batch_delete,
        routes::users_user_id_head_get,
        routes::users_user_id_head_put
    ),
    components(schemas(
        gen::IdToken,
        gen::Patch,
        gen::PatchKey,
        gen::SysHealthResponse,
        gen::FakeIdpCreateUserRequest,
        gen::FakeIdpCreateUserResponse,
        gen::FakeIdpCreateIdTokenRequest,
        gen::FakeIdpCreateIdTokenResponse,
        gen::CreateUserRequest,
        gen::CreateUserResponse,
        gen::CreateClientRequest,
        gen::CreateClientResponse,
        gen::GetPendingPatchesResponse,
        gen::DeletePendingPatchesRequest,
        gen::DeletePendingPatchesResponse,
        gen::CreatePatchesRequest,
        gen::CreatePatchesResponse,
        gen::GetHeadResponse,
        gen::UpdateHeadRequest,
        gen::UpdateHeadResponse
    )),
    servers((url = "/api/v2")),
    security(("bearerAuth" = [])),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert(Default::default());
        components.add_security_scheme(
            "bearerAuth",
            SecurityScheme::Http(
                HttpBuilder::new()
                    .scheme(HttpAuthScheme::Bearer)
                    .description(Some(
                        "Use the following value for the `Authorization` header:\n\n``````\nBearer <id_token>\n``````\n\nwhere `<id_token>` is the Base64-encoded ID token.",
                    ))
                    .build(),
            ),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::ApiDoc;
    use utoipa::OpenApi;

    #[test]
    fn openapi_spec_is_up_to_date() {
        let mut generated = ApiDoc::openapi().to_yaml().expect("failed to render openapi");
        generated.push('\n');

        let spec_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../openapi/api_v2.yaml");
        let expected = std::fs::read_to_string(&spec_path)
            .unwrap_or_else(|_| panic!("failed to read {}", spec_path.display()));

        assert_eq!(expected, generated, "Run `cargo run --bin generate_openapi` to refresh openapi/api_v2.yaml");
    }
}
