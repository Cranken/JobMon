# Readme

## Prerequisites

Per Node Metrics are collected by the [ClusterCockpit Metric Collector](https://github.com/ClusterCockpit/cc-metric-collector/).
SLURM Job Data is collected by the `jobmon_slurm` Prolog/Epilog script in `/scripts`. However, this is only serves as an example.

## Development Setup

The `backend/config.json` and `.env` must have been adjusted beforehand.

Node version should be >= 16.11.12.
Go version needs to be >= 1.18.

Package manager Yarn should have been installed globally.

The easiest way is to use two terminals.
Terminal 1:

```bash
cd backend

# install all required modules
go get

# compiles and run the application
go run .
```

Terminal 2:

```bash
cd frontend

# install all dependencies for the project
yarn install

# Starts the application in development mode
# (hot-code reloading, error reporting, etc.)
yarn dev
```

The frontend should be available at: <http://localhost:3000>

The script `start_dev_env.sh` combines these two steps for convenience and starts the Jobmon frontend and backend in one Tmux session

## Production Use

After setting up the Docker environment in the file `.env` and the backend configuration in the JSON file `backend/config.json`, the docker compose command can be used for easy deployment of the stack.

The `.env` file specifies the frontend database authentication keys as well as the ports the docker containers will run on.

The `backend/config.json` file contains the configuration for the backend as well as the metrics.

The command

```bash
sudo docker compose up [--detach]
```

brings up the whole stack which consist of the five services:

* jobmon_frontend (Next.js server for the frontend)
* jobmon_backend (golang backend)
* jobmon_influxdb (InfluxDB as time series database)
* jobmon_postgres (PostgreSQL for job metadata store)
* jobmon_nginx (NGinx as SSL endpoint for frontend and backend)

To rebuild the whole software stack with the latest docker images you can use:

```bash
sudo docker compose build --pull
```

You can access the containers with the `docker` command.
Some examples for common tasks:

* Query the InfluxDB

  ```bash
  sudo docker exec JobMonInfluxDB influx query ...
  ```

* Export InfluxDB metrics in line protocol format
  (See: [influxd inspect export-lp](https://docs.influxdata.com/influxdb/v2.6/reference/cli/influxd/inspect/export-lp/))

  ```bash
  sudo docker exec JobMonInfluxDB \
      influx bucket list

  # -> Set bucket IDs
  BUCKET_ID="..."
  # -> Set start time e.g. one hour ago
  START=$(date --iso-8601=sec -d '1 hour ago')

  sudo docker exec JobMonInfluxDB \
      influxd inspect export-lp --bucket-id ${BUCKET_ID} --engine-path /var/lib/influxdb2/engine/ --output-path - --start "${START}" |
          pzstd - -o lp.zstd
  ```

* Write metrics in line protocol format to the InfluxDB
  (see [influx write]( https://docs.influxdata.com/influxdb/v2.6/reference/cli/influx/write/))

  ```bash
  BUCKET_NAME="collector"
  zstdcat lp.zstd |
      sudo docker exec --interactive JobMonInfluxDB \
          influx write --format lp --bucket ${BUCKET_NAME}
  ```

* Access the PostgreSQL interactive terminal

  ```bash
  sudo docker exec --interactive --tty JobMonPostgres \
      psql --username=postgres --password --dbname=jobmon --host postgres --port 5432
  ```

* Dump the PostgreSQL database for backup purpose

  ```bash
  sudo docker exec --env PGPASSWORD="<PSQL_PASSWORD>" JobMonPostgres \
      pg_dump --username=postgres --dbname=jobmon --host postgres --port 5432 | \
          zstd - -o jobmon-psql.dump.zstd
  ```

* Restore the PostgreSQL database from backup

  ```bash
  zstdcat jobmon-psql.dump.zstd |
      sudo docker exec --interactive --env PGPASSWORD="<PSQL_PASSWORD>" JobMonPostgres \
          psql --username=postgres --dbname=jobmon --host postgres --port 5432
  ```

* Watch the log output of the frontend or backend

  ```bash
  docker logs --follow JobMonFrontend
  docker logs --follow JobMonBackend
  ```

## API Documentation

For further information about the available API endpoints, check out [doc/API.md](doc/API.md).
