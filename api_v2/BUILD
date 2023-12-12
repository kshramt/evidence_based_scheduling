load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@crate_index//:defs.bzl", "aliases", "all_crate_deps")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_push", "oci_tarball")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")
load("@rules_rust//rust:defs.bzl", "rust_binary", "rust_test")

rust_binary(
    name = "api_v2",
    srcs = glob(["src/**/*.rs"]),
    aliases = aliases(),
    compile_data = [
        "@//:.sqlx",
    ],
    proc_macro_deps = all_crate_deps(
        proc_macro = True,
    ),
    rustc_env = {
        "SQLX_OFFLINE_DIR": ".sqlx",
    },
    visibility = ["//visibility:public"],
    deps = all_crate_deps() + [
        "@//id_generator",
    ],
)

rust_test(
    name = "unit_test",
    aliases = aliases(
        normal_dev = True,
        proc_macro_dev = True,
    ),
    crate = ":api_v2",
    proc_macro_deps = all_crate_deps(proc_macro_dev = True),
    deps = all_crate_deps(normal_dev = True) + [
        "@//id_generator",
    ],
)

pkg_tar(
    name = "oci_api_v2_tar",
    srcs = [":api_v2"],
    package_dir = "app",
)

oci_image(
    name = "oci_prod_api_v2",
    base = "@oci_distroless_cc_orig",
    entrypoint = ["./api_v2"],
    tars = [
        ":oci_api_v2_tar",
    ],
    workdir = "/app",
)

write_file(
    name = "oci_tags_tmpl",
    out = "oci_tags.tmpl",
    content = [
        "{TAG}",
    ],
)

expand_template(
    name = "oci_prod_api_v2_tags_stamped",
    out = "oci_prod_api_v2_tags.txt",
    stamp_substitutions = {
        "{TAG}": "{{BUILD_EMBED_LABEL}}",
    },
    substitutions = {
        "{TAG}": "recent",
    },
    template = ":oci_tags_tmpl",
)

write_file(
    name = "oci_repo_tags_tmpl",
    out = "oci_repo_tags.tmpl",
    content = [
        "{REPO}:{TAG}",
    ],
)

expand_template(
    name = "oci_prod_api_v2_repo_tags_stamped",
    out = "oci_prod_api_v2_repo_tags.txt",
    stamp_substitutions = {
        "{REPO}": "ghcr.io/kshramt/evidence_based_scheduling/api_v22",
        "{TAG}": "{{BUILD_EMBED_LABEL}}",
    },
    substitutions = {
        "{REPO}": "ghcr.io/kshramt/evidence_based_scheduling/api_v22",
        "{TAG}": "recent",
    },
    template = ":oci_repo_tags_tmpl",
)

oci_push(
    name = "oci_prod_api_v2_push",
    image = ":oci_prod_api_v2",
    remote_tags = ":oci_prod_api_v2_tags_stamped",
    # todo: Rename api_v22 to api_v2.
    repository = "ghcr.io/kshramt/evidence_based_scheduling/api_v22",
)

oci_tarball(
    name = "oci_prod_api_v2_tar",
    image = ":oci_prod_api_v2",
    repo_tags = ":oci_prod_api_v2_repo_tags_stamped",
)
