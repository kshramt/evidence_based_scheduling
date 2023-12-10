load("@crate_index//:defs.bzl", "aliases", "all_crate_deps")
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
        "SQLX_OFFLINE_DIR": ".",
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
