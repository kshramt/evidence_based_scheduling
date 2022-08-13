variable sha {
}
variable ref_b64 {
}
variable base {
  default = "ghcr.io/kshramt/evidence_based_scheduling"
}

target "test_api" {
  dockerfile = "Dockerfile"
  target = "test_api"
  output = ["type=docker"]
}
target "test_client" {
  dockerfile = "Dockerfile"
  target = "test_client"
  output = ["type=docker"]
}
target "prod" {
  dockerfile = "Dockerfile"
  target = "prod"
  output = ["type=docker"]
}

target "test_api-linux-amd64" {
  inherits = ["test_api"]
  tags = ["${base}/test_api:${sha}-linux-amd64"]
  platforms = ["linux/amd64"]
  args = {
    arch = "amd64"
  }
  cache-from = ["type=registry,ref=${base}/test_api:${ref_b64}-linux-amd64-cache"]
  cache-to = ["type=registry,ref=${base}/test_api:${ref_b64}-linux-amd64-cache,mode=max"]
}
target "test_client-linux-amd64" {
  inherits = ["test_client"]
  tags = ["${base}/test_client:${sha}-linux-amd64"]
  platforms = ["linux/amd64"]
  args = {
    arch = "amd64"
  }
  cache-from = ["type=registry,ref=${base}/test_client:${ref_b64}-linux-amd64-cache"]
  cache-to = ["type=registry,ref=${base}/test_client:${ref_b64}-linux-amd64-cache,mode=max"]
}
target "prod-linux-amd64" {
  inherits = ["prod"]
  tags = ["${base}:${sha}-linux-amd64"]
  platforms = ["linux/amd64"]
  args = {
    arch = "amd64"
  }
  cache-from = ["type=registry,ref=${base}:${ref_b64}-linux-amd64-cache"]
  cache-to = ["type=registry,ref=${base}:${ref_b64}-linux-amd64-cache,mode=max"]
}

target "test_api-linux-arm64" {
  inherits = ["test_api"]
  tags = ["${base}/test_api:${sha}-linux-arm64"]
  platforms = ["linux/arm64"]
  args = {
    arch = "arm64"
  }
  cache-from = ["type=registry,ref=${base}/test_api:${ref_b64}-linux-arm64-cache"]
  cache-to = ["type=registry,ref=${base}/test_api:${ref_b64}-linux-arm64-cache,mode=max"]
}
target "test_client-linux-arm64" {
  inherits = ["test_client"]
  tags = ["${base}/test_client:${sha}-linux-arm64"]
  platforms = ["linux/arm64"]
  args = {
    arch = "arm64"
  }
  cache-from = ["type=registry,ref=${base}/test_client:${ref_b64}-linux-arm64-cache"]
  cache-to = ["type=registry,ref=${base}/test_client:${ref_b64}-linux-arm64-cache,mode=max"]
}
target "prod-linux-arm64" {
  inherits = ["prod"]
  tags = ["${base}:${sha}-linux-arm64"]
  platforms = ["linux/arm64"]
  args = {
    arch = "arm64"
  }
  cache-from = ["type=registry,ref=${base}:${ref_b64}-linux-arm64-cache"]
  cache-to = ["type=registry,ref=${base}:${ref_b64}-linux-arm64-cache,mode=max"]
}
