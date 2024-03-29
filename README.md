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
sudo docker compose up --build --pull always [--detach]
```

You can access the containers with the `docker` command.

### Maintenance Tasks for InfluxDB

* List authentication tokens

  ```bash
  sudo docker exec jobmon_influxdb \
      influx auth list
  ```

* View the retention period for all buckets. The retention service automatically deletes “expired” data and optimizes disk usage without any user intervention.

  ```bash
  sudo docker exec jobmon_influxdb \
    influx bucket list
  ```

* Update retention period for a bucket.

  ```bash
  # -> Set bucket ID
  BUCKET_ID="..."
  sudo docker exec jobmon_influxdb \
    influx bucket update --id ${BUCKET_ID} --retention 3360h
  ```

* Remove all metrics before `${STOP_DATE}` from bucket `${BUCKET_NAME}`

  ```bash
  sudo docker exec jobmon_influxdb \
  influx delete --bucket "${BUCKET_NAME}" --start '1970-01-01T00:00:00Z' --stop '${STOP_DATE}'
  ```

* List tasks

  ```bash
  sudo docker exec jobmon_influxdb \
    influx task list
  ```

* Query the InfluxDB

  ```bash
  sudo docker exec jobmon_influxdb \
      influx query ...
  ```

* Export InfluxDB metrics in line protocol format
  (See: [influxd inspect export-lp](https://docs.influxdata.com/influxdb/v2.6/reference/cli/influxd/inspect/export-lp/))

  ```bash
  sudo docker exec jobmon_influxdb \
      influx bucket list --org myOrg --name myBucket

  # -> Set bucket IDs
  BUCKET_ID="..."
  # -> Set start time e.g. one hour ago
  START=$(date --iso-8601=sec -d '1 hour ago')

  sudo docker exec jobmon_influxdb \
      influxd inspect export-lp --bucket-id ${BUCKET_ID} --engine-path /var/lib/influxdb2/engine/ --output-path - --start "${START}" |
          pzstd - -o lp.zstd
  ```

* Write metrics in line protocol format to the InfluxDB
  (see [influx write]( https://docs.influxdata.com/influxdb/v2.6/reference/cli/influx/write/))

  ```bash
  BUCKET_NAME="collector"
  zstdcat lp.zstd |
      sudo docker exec --interactive jobmon_influxdb \
          influx write --format lp --bucket ${BUCKET_NAME}
  ```

### Maintenance Tasks for PostgreSQL

* Get version information

  ``` bash
  sudo docker exec jobmon_postgres \
      psql --version
  ```

* Access the PostgreSQL interactive terminal

  ```bash
  sudo docker exec --interactive --tty --user postgres jobmon_postgres \
      psql --dbname=jobmon
  ```

* Dump the jobmon PostgreSQL database for backup purpose

  ```bash
  sudo docker exec --user postgres jobmon_postgres \
      pg_dump --dbname=jobmon | \
          zstd - -o jobmon_postgres.dump.zstd
  ```

* Dump all PostgreSQL database for backup purpose

  ```bash
  sudo docker exec --user postgres jobmon_postgres \
      pg_dumpall | \
          zstd - -o postgres.dumpall.zstd
  ```

* Restore the jobmon PostgreSQL database from backup

  ```bash
  zstdcat jobmon_postgres.dump.zstd |
      sudo docker exec --interactive --user postgres jobmon_postgres \
          psql --dbname=jobmon
  ```

### Maintenance Tasks for Frontend and Backend

* Watch the log output of the frontend or backend

  ```bash
  docker logs --follow jobmon_frontend
  docker logs --follow jobmon_backend
  ```

## API Documentation

For further information about the available API endpoints, check out [doc/API.md](doc/API.md).
