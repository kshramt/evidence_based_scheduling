load("@rules_oci//oci:defs.bzl", "oci_image", "oci_tarball")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")

platform(
    name = "linux_amd64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
)

platform(
    name = "linux_arm64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:arm64",
    ],
)

config_setting(
    name = "is_linux_amd64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
)

config_setting(
    name = "is_linux_arm64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:arm64",
    ],
)

pkg_tar(
    name = "oci_envoy_envoy_yaml_tar",
    srcs = ["envoy.yaml"],
    package_dir = "/etc/envoy",
)

oci_image(
    name = "oci_prod_envoy",
    base = select({
        ":is_linux_amd64": "@oci_envoy_orig_amd64",
        ":is_linux_arm64": "@oci_envoy_orig_arm64",
    }),
    tars = [
        ":oci_envoy_envoy_yaml_tar",
    ],
    # exposed_ports = ["8080"],
    workdir = "/app",
)

oci_tarball(
    name = "oci_prod_envoy_tar_linux_amd64",
    image = ":oci_prod_envoy",
    repo_tags = ["ok-go:1-amd64"],
)

oci_tarball(
    name = "oci_prod_envoy_tar_linux_arm64",
    image = ":oci_prod_envoy",
    repo_tags = ["ok-go:1-arm64"],
)
