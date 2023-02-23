# DockerHub Page: https://hub.docker.com/_/golang
# GitHub Repository: https://github.com/docker-library/golang/
FROM golang:1.20-alpine

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

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

RUN go build -o /docker-jobmon-backend

EXPOSE 8080

CMD [ "/docker-jobmon-backend" ]
