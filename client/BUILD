load("@//:oci.bzl", "declare_oci")
load("@aspect_rules_js//js:defs.bzl", "js_run_binary", "js_run_devserver", "js_test")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//client:typescript/package_json.bzl", typescript_bin = "bin")
load("@npm//client:vite/package_json.bzl", vite_bin = "bin")
load("@rules_oci//oci:defs.bzl", "oci_image")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")

npm_link_all_packages()

# https://github.com/aspect-build/rules_ts/issues/190
_TSCONFIG_LIST = [
    "tsconfig.json",
    "tsconfig.node.json",
    "vite.config.ts",
]

typescript_bin.tsc_test(
    name = "typecheck",
    args = ["--noEmit"],
    chdir = package_name(),
    data = _TSCONFIG_LIST + [
        "package.json",
        ":node_modules",
    ] + glob([
        "src/**",
    ]),
)

vite_bin.vite(
    name = "build",
    srcs = glob(
        include = ["src/**"],
        exclude = [
            "src/**/*.spec.ts",
            "src/**/*.spec.tsx",
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
        ],
    ) + _TSCONFIG_LIST + [
        "index.html",
        "package.json",
        "postcss.config.cjs",
        "tailwind.config.cjs",
        ":node_modules",
    ] + glob([
        "public/**",
    ]),
    args = ["build"],
    chdir = package_name(),
    out_dirs = ["dist"],
)

pkg_tar(
    name = "dist_tar",
    srcs = [
        ":build",
    ],
    package_dir = "/usr/share/nginx/html",
)

pkg_tar(
    name = "conf_tar",
    srcs = [
        "@//:nginx.conf",
    ],
    package_dir = "/etc/nginx",
)

oci_image(
    name = "oci_prod",
    base = "@oci_nginx_orig",
    tars = [
        ":dist_tar",
        ":conf_tar",
    ],
)

declare_oci(
    image = "oci_prod",
    repo = "ghcr.io/kshramt/evidence_based_scheduling/nginx2",
)
