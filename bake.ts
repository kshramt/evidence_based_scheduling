#!/usr/bin/env -S deno run --allow-all

const usage_and_exit = () => {
  console.error(
    "Usage: bake.ts <sha> <ref_b64> [<base>] [<ignore_cache_error>]"
  );
  Deno.exit(1);
};

const run = (
  sha: string,
  ref_b64: string,
  base: string,
  ignore_cache_error: boolean
) => {
  const zstd = "compression=zstd,force-compression=true";
  const spec: {
    group: Record<string, { targets: string[] }>;
    target: Record<
      string,
      {
        "cache-from": string[];
        "cache-to": string[];
        args: Record<string, string>;
        dockerfile: string;
        output: string[];
        platforms: string[];
        tags: string[];
        target: string;
      }
    >;
  } = { group: {}, target: {} };
  for (const platform of [
    { os: "linux", arch: "amd64" },
    { os: "linux", arch: "arm64" },
  ]) {
    const test_ks: string[] = [];
    const prod_ks: string[] = [];
    for (const [target, image_name] of [
      ["prod_api_v2", "/api_v2"],
      ["prod_envoy", "/envoy"],
      ["prod_nginx", "/nginx"],
      ["prod_postgres_migration", "/postgres_migration"],
      ["prod_postgres", "/postgres"],
      ["test_client", "/client/test"],
      ["tests_e2e", "/tests_e2e"],
    ] as const) {
      const k = `${target}-${platform.os}-${platform.arch}`;
      const v = {
        "cache-from": [
          `type=registry,ref=${base}${image_name}/cache:${ref_b64}-${platform.os}-${platform.arch}`,
          `type=registry,ref=${base}${image_name}/cache:latest-${platform.os}-${platform.arch}`,
          `type=registry,ref=${base}${image_name}:${ref_b64}-${platform.os}-${platform.arch}`,
          `type=registry,ref=${base}${image_name}:latest-${platform.os}-${platform.arch}`,
        ],
        "cache-to": [
          `type=registry,ref=${base}${image_name}/cache:${ref_b64}-${platform.os}-${platform.arch},mode=max,${zstd},ignore-error=${ignore_cache_error}`,
          `type=registry,ref=${base}${image_name}/cache:latest-${platform.os}-${platform.arch},mode=max,${zstd},ignore-error=${ignore_cache_error}`,
        ],
        dockerfile: "Dockerfile",
        output: [`type=docker,${zstd}`],
        platforms: [`${platform.os}/${platform.arch}`],
        tags: [`${base}${image_name}:h-${sha}-${platform.os}-${platform.arch}`],
        target,
        args: { arch: platform.arch },
      };
      spec.target[k] = v;
      if (k.startsWith("prod_")) {
        prod_ks.push(k);
      } else {
        test_ks.push(k);
      }
    }
    spec.group[`${platform.os}-${platform.arch}-prod`] = { targets: prod_ks };
    spec.group[`${platform.os}-${platform.arch}-test`] = { targets: test_ks };
  }
  console.log(JSON.stringify(spec, null, 2));
};

const main = (args: string[]) => {
  if (args.length < 2 || 4 < args.length) {
    usage_and_exit();
  }
  const sha = args[0];
  const ref_b64 = args[1];
  const base =
    args[2] === undefined
      ? "ghcr.io/kshramt/evidence_based_scheduling"
      : args[2];
  const ignore_cache_error =
    args[3] === undefined ? false : !!JSON.parse(args[3]);

  run(sha, ref_b64, base, ignore_cache_error);
};

main(Deno.args);
