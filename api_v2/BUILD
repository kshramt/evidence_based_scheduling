load("@//:oci.bzl", "declare_oci")
load("@crate_index//:defs.bzl", "aliases", "all_crate_deps")
load("@rules_oci//oci:defs.bzl", "oci_image")
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

declare_oci(
    image = "oci_prod_api_v2",
    repo = "ghcr.io/kshramt/evidence_based_scheduling/api_v22",
)
