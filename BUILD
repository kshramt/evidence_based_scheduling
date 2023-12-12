load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@bazel_skylib//rules:write_file.bzl", "write_file")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_push", "oci_tarball")
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

write_file(
    name = "oci_tags_tmpl",
    out = "oci_tags.tmpl",
    content = [
        "{TAG}",
    ],
)

expand_template(
    name = "oci_prod_envoy_tags_stamped",
    out = "oci_prod_envoy_tags.txt",
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
    name = "oci_prod_envoy_repo_tags_stamped",
    out = "oci_prod_envoy_repo_tags.txt",
    stamp_substitutions = {
        "{REPO}": "ghcr.io/kshramt/evidence_based_scheduling/envoy2",
        "{TAG}": "{{BUILD_EMBED_LABEL}}",
    },
    substitutions = {
        "{REPO}": "ghcr.io/kshramt/evidence_based_scheduling/envoy2",
        "{TAG}": "recent",
    },
    template = ":oci_repo_tags_tmpl",
)

oci_push(
    name = "oci_prod_envoy_push",
    image = ":oci_prod_envoy",
    remote_tags = ":oci_prod_envoy_tags_stamped",
    # todo: Rename envoy2 to envoy.
    repository = "ghcr.io/kshramt/evidence_based_scheduling/envoy2",
)

oci_tarball(
    name = "oci_prod_envoy_tar",
    image = ":oci_prod_envoy",
    repo_tags = ":oci_prod_envoy_repo_tags_stamped",
)

filegroup(
    name = ".sqlx",
    srcs = glob([".sqlx/*.json"]),
    visibility = ["//visibility:public"],
)
