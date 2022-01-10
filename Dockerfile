FROM golang:1.17.5-alpine

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

ADD auth ./auth
ADD config ./config
ADD db ./db
ADD job ./job
ADD lru_cache ./lru_cache
ADD persistent_store ./persistent_store
ADD utils ./utils

COPY jobmon.go ./

RUN go build -o /docker-jobmon-backend

EXPOSE 8080

CMD [ "/docker-jobmon-backend" ]
