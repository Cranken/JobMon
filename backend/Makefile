APP := docker-jobmon-backend

default: build

# Examine Go source code and reports suspicious constructs
.PHONY: vet
vet:
	go vet ./...

# Run linter for the Go programming language.
# Using static analysis, it finds bugs and performance issues, offers simplifications, and enforces style rules
.PHONY: staticcheck
staticcheck:
	go install honnef.co/go/tools/cmd/staticcheck@latest
	$$(go env GOPATH)/bin/staticcheck ./...


.PHONY: module_update
module_update:
	go get -u
	go mod tidy

.PHONY: module_download
module_download:
	go mod download
	go mod verify

.PHONY: build
build: module_download
	go build -o $(APP)

.PHONY: clean
clean:
	rm -f  $(APP)

.PHONY: run
.ONESHELL:
run: module_download
	OPTIONS=()
	if [[ -n "$(CONFIG)" ]]; then
	    OPTIONS+=( --config="$(CONFIG)" )
	fi
	if [[ -n "$(LOGLEVEL)" ]]; then
	    OPTIONS+=( --log="$(LOGLEVEL)" )
	fi
	if [[ -n "${LISTEN_ADDR}" ]]; then
	    OPTIONS+=( --listen-addr="$(LISTEN_ADDR)" )
	fi
	go run . $${OPTIONS[@]}
