# Evidence Based Scheduling

[![ci](https://github.com/kshramt/evidence_based_scheduling/actions/workflows/ci.yml/badge.svg)](https://github.com/kshramt/evidence_based_scheduling/actions/workflows/ci.yml)

This is a TODO application, which supports [the evidence based scheduling](https://www.joelonsoftware.com/2007/10/26/evidence-based-scheduling/).

The numbers shown on the right are the 0th, 10th, 33rd, 50th, 67th, 90th, and 100th percentiles of the estimated completion time in hours.

## Usage

```
docker run \
  --rm \
  --init \
  --mount type=bind,source="$PWD"/data,target=/data \
  -e USE_LITESTREAM=no \
  -p 8080:8080 \
  ghcr.io/kshramt/evidence_based_scheduling:latest

# or

docker run \
  --rm \
  --init \
  --mount type=bind,source="$PWD"/data,target=/data \
  -e REPLICA_URI=gcs://<bucket>/data.sqlite \
  -p 8080:8080 \
  ghcr.io/kshramt/evidence_based_scheduling:latest

# or

# --log-driver local \
docker run \
  -d \
  --name ebs \
  --init \
  --log-driver journald \
  --mount type=bind,source="$PWD"/data,target=/data \
  -e REPLICA_URI=gcs://<bucket>/data.sqlite \
  -p8080:8080 \
  --restart always \
  ghcr.io/kshramt/evidence_based_scheduling:latest
# journalctl  CONTAINER_NAME=ebs

# docker pull ghcr.io/kshramt/evidence_based_scheduling:latest && docker container stop ebs && docker container rm ebs
```

## Development

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

```
UVICORN_PORT=5000 make run_api
```

```
cd client
PORT=3000 DANGEROUSLY_DISABLE_HOST_CHECK=true npm run start
xdg-open http://localhost:3000
```
