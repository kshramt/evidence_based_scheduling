load("@//:oci.bzl", "declare_oci")
load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_push", "oci_tarball")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")

npm_link_all_packages(name = "node_modules")

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

filegroup(
    name = ".sqlx",
    srcs = glob([".sqlx/*.json"]),
    visibility = ["//:__subpackages__"],
)

write_file(
    name = "oci_tags_tmpl",
    out = "oci_tags.tmpl",
    content = [
        "{TAG}",
    ],
    visibility = ["//:__subpackages__"],
)

write_file(
    name = "oci_repo_tags_tmpl",
    out = "oci_repo_tags.tmpl",
    content = [
        "{REPO}:{TAG}",
    ],
    visibility = ["//:__subpackages__"],
)

exports_files(
    ["nginx.conf"],
    visibility = ["//:__subpackages__"],
)

declare_oci(
    image = "oci_prod_envoy",
    repo = "ghcr.io/kshramt/evidence_based_scheduling/envoy2",
)
