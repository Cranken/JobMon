###
# Create golang build image
# * [DockerHub Page](https://hub.docker.com/_/golang)
# * [GitHub Repository](https://github.com/docker-library/golang/)
# * [Release History](https://go.dev/doc/devel/release)
###
FROM golang:1.20-bullseye AS build

WORKDIR /app

# Download required go modules
COPY go.mod go.sum ./
RUN go mod download && go mod verify

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
# * [Debian Relases](https://wiki.debian.org/DebianReleases)
###
FROM debian:bullseye

WORKDIR /app

# Use binary from build image
COPY --from=build /app/docker-jobmon-backend ./docker-jobmon-backend

EXPOSE 8080

CMD [ "./docker-jobmon-backend" ]
