"""Common rules for building and pushing OCI images."""

load("@aspect_bazel_lib//lib:expand_template.bzl", "expand_template")
load("@rules_oci//oci:defs.bzl", "oci_push", "oci_tarball")

def declare_oci(image, repo):
    """Declare rules for building and pushing OCI images.

    Args:
        image: The image name (the image argument to oci_image).
        repo: The repository to push the image to.
    """

    expand_template(
        name = "{}_tags_stamped".format(image),
        out = "{}_tags.txt".format(image),
        stamp_substitutions = {
            "{TAG}": "{{BUILD_EMBED_LABEL}}",
        },
        substitutions = {
            "{TAG}": "recent",
        },
        template = "@//:oci_tags_tmpl",
    )

    expand_template(
        name = "{}_repo_tags_stamped".format(image),
        out = "{}_repo_tags.txt".format(image),
        stamp_substitutions = {
            "{REPO}": repo,
            "{TAG}": "{{BUILD_EMBED_LABEL}}",
        },
        substitutions = {
            "{REPO}": repo,
            "{TAG}": "recent",
        },
        template = "@//:oci_repo_tags_tmpl",
    )

    oci_push(
        name = "{}_push".format(image),
        image = ":{}".format(image),
        remote_tags = ":{}_tags_stamped".format(image),
        repository = repo,
    )

    oci_tarball(
        name = "{}_tar".format(image),
        image = ":{}".format(image),
        repo_tags = ":{}_tags_stamped".format(image),
    )
