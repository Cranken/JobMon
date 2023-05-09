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

# Build backend
RUN --mount=type=cache,target=/root/.cache/go-build \
[ "/bin/bash", "-c", \
"go build -o docker-jobmon-backend" \
]

###
# Create image from builder for vetting
#
# Vet examines Go source code and reports suspicious constructs
# See: go doc cmd/vet
# See: https://pkg.go.dev/cmd/vet
###
FROM builder AS vetting

CMD [ "go", "vet", "-v", "./..." ]

###
# Create image from builder for static checking
#
# Staticcheck is a state of the art linter for the Go programming language.
# Using static analysis, it finds bugs and performance issues, offers simplifications, and enforces style rules.
# See: https://github.com/dominikh/go-tools
###
FROM builder AS staticchecking

# Install [The advanced Go linter](https://github.com/dominikh/go-tools)
RUN go install honnef.co/go/tools/cmd/staticcheck@latest

CMD [ "/go/bin/staticcheck", "-f", "stylish", "./..." ]

###
# Create image from builder for testing
###
FROM builder AS testing

CMD [ "go", "test", "-v", "./..." ]

###
# Create image from builder to create testreports
#
# gotestsum runs tests using go test -json, prints formatted test output,
# and a summary of the test run.
# It is designed to work well for both local development, and for automation like CI.
###
FROM builder AS reporter

# Install [gotestsum](https://github.com/gotestyourself/gotestsum)
RUN go install gotest.tools/gotestsum@latest

CMD [ "/go/bin/gotestsum", "--junitfile", "report_backend.xml", "--format", "testname" ]

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
