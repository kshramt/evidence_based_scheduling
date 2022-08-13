variable sha {
}
variable ref_b64 {
}
variable base {
  default = "ghcr.io/kshramt/evidence_based_scheduling"
}

target "test_api" {
  dockerfile = "Dockerfile"
  targets = ["test_api"]
  push = true
}
target "test_client" {
  dockerfile = "Dockerfile"
  targets = ["test_api"]
  push = true
}
target "prod" {
  dockerfile = "Dockerfile"
  targets = ["prod"]
  push = true
}

target "test_api/linux/amd64" {
  inherits = ["test_api"]
  tags = ["${base}/test_api/linux/riscv64:${sha}"]
  platforms = ["linux/amd64"]
  cache-from = ["type=registry,ref=${base}/test_api/linux/amd64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/test_api/linux/amd64/cache:${ref_b64},mode=max"]
}
target "test_client/linux/amd64" {
  inherits = ["test_client"]
  tags = ["${base}/test_client/linux/riscv64:${sha}"]
  platforms = ["linux/amd64"]
  cache-from = ["type=registry,ref=${base}/test_client/linux/amd64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/test_client/linux/amd64/cache:${ref_b64},mode=max"]
}
target "prod/linux/amd64" {
  inherits = ["prod"]
  tags = ["${base}/linux/amd64:${sha}"]
  platforms = ["linux/amd64"]
  cache-from = ["type=registry,ref=${base}/linux/amd64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/linux/amd64/cache:${ref_b64},mode=max"]
}

target "test_api/linux/arm64" {
  inherits = ["test_api"]
  tags = ["${base}/test_api/linux/riscv64:${sha}"]
  platforms = ["linux/arm64"]
  cache-from = ["type=registry,ref=${base}/test_api/linux/arm64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/test_api/linux/arm64/cache:${ref_b64},mode=max"]
}
target "test_client/linux/arm64" {
  inherits = ["test_client"]
  tags = ["${base}/test_client/linux/riscv64:${sha}"]
  platforms = ["linux/arm64"]
  cache-from = ["type=registry,ref=${base}/test_client/linux/arm64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/test_client/linux/arm64/cache:${ref_b64},mode=max"]
}
target "prod/linux/arm64" {
  inherits = ["prod"]
  tags = ["${base}/linux/arm64:${sha}"]
  platforms = ["linux/arm64"]
  cache-from = ["type=registry,ref=${base}/linux/arm64/cache:${ref_b64}"]
  cache-to = ["type=registry,ref=${base}/linux/arm64/cache:${ref_b64},mode=max"]
}
