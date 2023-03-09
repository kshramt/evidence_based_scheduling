from ubuntu:18.04

run --mount=type=cache,target=/var/cache/apt,sharing=locked \
   --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
   apt-get update \
   && DEBIAN_FRONTEND=noninteractive apt-get install -y curl

arg arch
arg docker_version=23.0.1
RUN curl -fsSLO https://download.docker.com/linux/static/stable/${arch?}/docker-${docker_version}.tgz \
  && tar xzvf docker-${docker_version}.tgz --strip 1 \
                 -C /usr/local/bin docker/docker \
  && rm docker-${docker_version}.tgz
