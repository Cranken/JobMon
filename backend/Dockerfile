###
# Create golang build image
# * [DockerHub Page](https://hub.docker.com/_/golang)
# * [GitHub Repository](https://github.com/docker-library/golang/)
# * [Release History](https://go.dev/doc/devel/release)
###
ARG GOLANG_RELEASE=1.20 \
    DEBIAN_RELEASE=bullseye \
    GOLANG_TAG=${GOLANG_RELEASE}-${DEBIAN_RELEASE} \
    DEBIAN_TAG=${DEBIAN_RELEASE}

FROM golang:${GOLANG_TAG} AS builder

WORKDIR /app

# Install [The advanced Go linter](https://github.com/dominikh/go-tools)
RUN go install honnef.co/go/tools/cmd/staticcheck@latest

# Download required go modules
COPY go.mod go.sum ./
RUN go mod download && \
    go mod verify

# Add source code to the image
ADD analysis ./analysis
ADD auth ./auth
ADD config ./config
ADD db ./db
ADD job ./job
ADD lru_cache ./lru_cache
ADD logging ./logging
ADD store ./store
ADD test ./test
ADD utils ./utils
ADD router ./router
ADD notify ./notify
COPY jobmon.go ./

# Default build environment settigs
ARG DO_VET=true \
    DO_STATICCHECK=true

# Build backend
RUN --mount=type=cache,target=/root/.cache/go-build \
[ "/bin/bash", "-c", \
"if [[ ${DO_VET} == true ]]; then \
     go vet ./... ; \
 fi && \
 if [[ ${DO_STATICCHECK} == true ]]; then \
     /go/bin/staticcheck ./... ; \
 fi && \
 go build -o docker-jobmon-backend" \
]

###
# Create minimal Debian backend image
# * [DockerHub Page](https://hub.docker.com/_/debian)
# * [GitHub Repository](https://github.com/docker-library/docs/tree/master/debian)
# * [Debian Releases](https://wiki.debian.org/DebianReleases)
###
FROM debian:${DEBIAN_TAG} AS runner

WORKDIR /app

# Install CA certificates to verify certificate of OpenID providers
RUN apt-get update \
    && apt-get install -y ca-certificates curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Use binary from build image
COPY --from=builder /app/docker-jobmon-backend ./docker-jobmon-backend

# Default environment settigs
ENV CONFIG="/app/config.json" \
    LOGLEVEL=3 \
    LISTEN_ADDR=":8080"
CMD [ \
"/bin/bash", "-c", \
"exec /app/docker-jobmon-backend \
    --config=\"${CONFIG}\" \
    --log=\"${LOGLEVEL}\" \
    --listen-addr=\"${LISTEN_ADDR}\"" \
]
