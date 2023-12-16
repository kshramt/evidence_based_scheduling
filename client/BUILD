load("@aspect_rules_js//js:defs.bzl", "js_run_binary", "js_run_devserver", "js_test")
load("@npm//:defs.bzl", "npm_link_all_packages")
load("@npm//client:typescript/package_json.bzl", typescript_bin = "bin")
load("@npm//client:vite/package_json.bzl", vite_bin = "bin")

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
