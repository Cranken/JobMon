###
# Create golang build image
# * [DockerHub Page](https://hub.docker.com/_/golang)
# * [GitHub Repository](https://github.com/docker-library/golang/)
# * [Release History](https://go.dev/doc/devel/release)
###
ARG DEBIAN_RELEASE=bullseye \
    GOLANG_RELEASE=1.20


###
# Go module dependencies
###
FROM golang:${GOLANG_RELEASE}-${DEBIAN_RELEASE} AS deps

WORKDIR /app

# Download required go modules
COPY go.mod go.sum ./
RUN go mod download && go mod verify

###
# Development environment
###
FROM deps AS dev_env

WORKDIR /app

# Install CA certificates to verify certificate of OpenID providers
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Default environment settigs
ENV CONFIG="/app/config.json" \
    LOGLEVEL=3 \
    LISTEN_ADDR=":8080"

CMD [ "/bin/bash", "-c", "exec go run . --config=\"${CONFIG}\" --log=\"${LOGLEVEL}\" --listen-addr=\"${LISTEN_ADDR}\"" ]

###
# Builder
###
FROM deps AS builder
WORKDIR /app

# Add source code to the image
ADD analysis ./analysis
ADD auth ./auth
ADD changepoint ./changepoint
ADD config ./config
ADD db ./db
ADD job ./job
ADD lru_cache ./lru_cache
ADD logging ./logging
ADD store ./store
ADD utils ./utils
ADD router ./router
COPY jobmon.go ./

# Build backend
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -o docker-jobmon-backend

###
# Create minimal Debian backend image
# * [DockerHub Page](https://hub.docker.com/_/debian)
# * [GitHub Repository](https://github.com/docker-library/docs/tree/master/debian)
# * [Debian Releases](https://wiki.debian.org/DebianReleases)
###
FROM debian:${DEBIAN_RELEASE} AS runner

WORKDIR /app

# Install CA certificates to verify certificate of OpenID providers
RUN apt-get update \
    && apt-get install -y ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Use binary from build image
COPY --from=builder /app/docker-jobmon-backend ./docker-jobmon-backend

# Default environment settigs
ENV CONFIG="/app/config.json" \
    LOGLEVEL=3 \
    LISTEN_ADDR=":8080"
CMD [ "/bin/bash", "-c", "exec /app/docker-jobmon-backend --config=\"${CONFIG}\" --log=\"${LOGLEVEL}\" --listen-addr=\"${LISTEN_ADDR}\"" ]
