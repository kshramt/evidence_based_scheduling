load("@rules_oci//oci:defs.bzl", "oci_image", "oci_tarball")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")

pkg_tar(
    name = "oci_envoy_envoy_yaml_tar",
    srcs = ["envoy.yaml"],
    package_dir = "/etc/envoy",
)

oci_image(
    name = "oci_prod_envoy",
    base = "@oci_envoy_orig",
    tars = [
        ":oci_envoy_envoy_yaml_tar",
    ],
    # exposed_ports = ["8080"],
    workdir = "/app",
)

oci_tarball(
    name = "oci_prod_envoy_tar",
    image = ":oci_prod_envoy",
    repo_tags = [],
)
