load("@aspect_rules_lint//lint:eslint.bzl", "eslint_aspect")
load("@aspect_rules_lint//lint:lint_test.bzl", "make_lint_test")
load("@aspect_rules_lint//lint:ruff.bzl", "ruff_aspect")
load("@aspect_rules_lint//lint:shellcheck.bzl", "shellcheck_aspect")

eslint = eslint_aspect(
    binary = "@@//tools:eslint",
    # We trust that eslint will locate the correct configuration file for a given source file.
    # See https://eslint.org/docs/latest/use/configure/configuration-files#cascading-and-hierarchy
    configs = [
        "@@//:.eslintrc",
    ],
)

eslint_test = make_lint_test(aspect = eslint)

ruff = ruff_aspect(
    binary = "@@//tools:ruff",
    configs = "@@//:pyproject.toml",
)

shellcheck = shellcheck_aspect(
    binary = "@@//tools:shellcheck",
    config = "@@//:.shellcheckrc",
)

shellcheck_test = make_lint_test(aspect = shellcheck)
