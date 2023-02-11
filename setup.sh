#!/bin/bash
set -e
echo "Monitoring Stack Initial Setup Script"
BACKEND_CONFIG_FILE=./backend/config.json
BACKEND_SAMPLE_CONFIG_FILE=./backend/sample.config.json
DEFAULT_PASSWORD_LENGTH=32
if [ -f "$BACKEND_CONFIG_FILE" ]; then
    read -p "Backend config already exists. Are you sure you want to redo the setup [y/N]?" -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    else
        echo
    fi
fi
echo "go"
# Ask if .env is already setup, if not ask user to do and exit
read -p "Have the values in .env already been set [y/N]?" -n 1 -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the values in .env first" >&2
    exit 1
else
    source .env
    echo
fi

# ask user if using local or remote containers
start_container() {
    docker compose up -d --quiet-pull $1 >/dev/null
    RES="$(docker ps -f \"name="$1"\" --format \"{{.State}}\")"
    if [ $RES != "running" ]; then
        echo "Could not start the "$1" container. Please check the docker logs for the container" >&2
        exit 1
    fi
}
parse_add() {
    IFS=":"
    read -p "Enter the hostname:port for the "$1": " -r -a ret
    if [[ ! ${#ret[@]} -eq 2 ]]; then
        echo "Invalid syntax. Please enter hostname:port"
        exit 1
    fi
    re='^[0-9]+$'
    if ! [[ ${ret[1]} =~ $re ]]; then
        echo "Error: Port not a number" >&2
        exit 1
    fi
    unset IFS
}
setup_both() {
    start_container influxdb
    start_container psql
}
setup_influxdb() {
    local ret
    parse_add "PostgreSQL"
    psql_host=${ret[0]}
    psql_port=${ret[1]}

    start_container influxdb
}
setup_postgresql() {
    local ret
    parse_add "InfluxDB"
    influxdb_host=${ret[0]}
    influxdb_port=${ret[1]}

    start_container psql
}
setup_none() {
    local ret
    parse_add "InfluxDB"
    influxdb_host=${ret[0]}
    influxdb_port=${ret[1]}

    parse_add "PostgreSQL"
    psql_host=${ret[0]}
    psql_port=${ret[1]}
}

echo "Should Docker Containers for InfluxDB and PostgreSQL be set up?
    1) Yes, set up both
    2) Only InfluxDB (User provides host url for PostgreSQL)
    3) Only PostgreSQL (User provides host url for InfluxDB)
    4) No (User provides host urls for InfluxDB and PostgreSQL)"
read -n 1 -r -s
case $REPLY in
1) setup_both ;;
2) setup_influxdb ;;
3) setup_postgresql ;;
4) setup_none ;;
*)
    echo "Invalid reply" >&2
    exit 1
    ;;
esac
## TODO
# generate influxdb token over api

# generate backend config.json with credentials from .env(psql) and api call(influxdb), JWT secret randomly generated

# ask to configure oidc auth, if not tell user to do it manually later
