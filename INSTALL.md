# Installation

The Jobmon software stack consists of several services, all managed by docker. Environment variables used by these services are stored in the `.env` file. To see the full Docker configuration, with variables resolved, the following command can be used:

```bash
docker compose convert
```

In the following sections we describe for each service how to configure and start it.

## InfluxDB

* Configure InfluxDB variables in the Docker environment file `.env`:
  * Password for InfluxDB super-user: `INFLUXDB_PASSWORD`.
  * Authentication token to associate with the super-user: `INFLUXDB_ADMIN_TOKEN`.
  * Organization name: `INFLUXDB_ORG`.
  * Bucket name: `INFLUXDB_BUCKET`.
  * Port that will be exposed (e.g. 8086 for InfluxDB default port): `INFLUXDB_PORT`.
* Start the InfluxDB container:

  ```bash
  docker compose up jobmon_influxdb --detach
  ```

* Check that InfluxDB container is running:

  ```bash
  docker ps --filter name=jobmon_influxdb --format "{{.State}}"
  ```

* Create authentication token for the jobmon_backend:

  ```bash
  docker exec jobmon_influxdb \
      influx auth create --description jobmon_backend --org ${INFLUXDB_ORG} --all-access
  ```

* Create authentication token for the metric collector:

  ```bash
  sudo docker exec jobmon_influxdb \
      influx bucket list --org ${INFLUXDB_ORG} --name ${INFLUXDB_BUCKET}

  # -> Set bucket IDs
  BUCKET_ID="..."

  sudo docker exec jobmon_influxdb \
      influx auth create --description collector --write-bucket ${BUCKET_ID} 
  ```

## PostgreSQL

* Configure PostgreSQL variables in the Docker environment file `.env`:
  * Superuser password for PostgreSQL: `POSTGRES_PASSWORD`.
  * Default database: `POSTGRES_DB`.
  * Port that will be exposed (e.g. 5432 for postgresql default port): `POSTGRES_PORT`.
* Start the PostgreSQL container:

  ```bash
  docker compose up  jobmon_postgres --detach
  ```

* Check that PostgreSQL container is running:

  ```bash
  docker ps --filter name=jobmon_postgres --format "{{.State}}"
  ```

## Backend

* Modify sample config file:

  ```bash
  cp backend/{sample.,}config.json
  ```

  Configure InfluxDB options according to the the settings in the InfluxDB section. For the DBHost option you can use the name of the Docker container for container internal traffic routing.

  ```json
  {
    "DBHost": "http://jobmon_influxdb:8086",
    "DBToken": "<influxdb_auth_token (access token to bucket ${INFLUXDB_BUCKET}>",
    "DBOrg": "${INFLUXDB_ORG}",
    "DBBucket": "${INFLUXDB_BUCKET}",
    ...
  }
  ```

  Configure PostgreSQL options according to the settings in the PostgreSQL section. For the PSQLHost option you can use the name of the Docker container for container internal traffic routing.

  ```json
  {
    ...
    "JobStore": {
      "Type": "postgres",
      "PSQLHost": "jobmon_postgres:5432",
      "PSQLUsername": "postgres",
      "PSQLPassword": "${POSTGRES_PASSWORD}",
      "PSQLDB": "${POSTGRES_DB}"
    },
    ...
  }
  ```

  Configure the secret which is used to generate the JSON web tokens. These web tokens are used to identify user sessions after users login.

  ```json
  {
    ...
    "JWTSecret": "<jwt_secret (secret to use when generating JSON Web Tokens)>",
    ...
  }
  ```

  Configure the URL which is used to access the jobmon website. As all accesses to the jobmon_frontend are routed through NGINX (see NGINX section), normally these URLs correspond to the NGINX addresses.

  ```json
  {
    ...
    "FrontendURL": "https://<frontend_url>",
    ...
  }
  ```

  You may also configure OpenID connection authentication, if more than local authentication is required.

* Start the jobmon_backend container:

  ```bash
  docker compose up jobmon_backend --detach
  ```

* Check that jobmon_backend container is running:

  ```bash
  docker ps --filter name=jobmon_backend --format "{{.State}}"
  ```

## Frontend

* Configure frontend variables in the Docker environment file `.env`:
  * Public URL to access the the backend from the clients webbrowser: `BACKEND_URL`.
  * Public websocket URL to access the backend from the clients webbrowser: `BACKEND_WS`.
  * As all access to the jobmon_backend is routed through NGINX (see NGINX section), normally these URLs correspondent to the NGINX address.
* Start the jobmon_frontend container:

  ```bash
  docker compose up jobmon_frontend --detach
  ```

* Check that jobmon_frontend container is running

  ```bash
  docker ps --filter name=jobmon_frontend --format "{{.State}}"
  ```

## NGINX

* Configure NGINX variables in the Docker environment file `.env`:
  * HTTP port that will be exposed (e.g. 80 for http default port): `NGINX_HTTP_PORT`.
    HTTP port is only used to redirect the request to the HTTPS port.
  * HTTPS port that will be exposed (e.g. 443 for https default port) `NGINX_HTTPS_PORT`.
    All requests to the jobmon_frontend and jobmon_backend will be routed through this port.
* Copy your certificate and certificate chain (`chain.pem`, `fullchain.pem`, `privkey.pem`) to folder `nginx/secrets/`. To obtain this certificate you may use services as [Let’s Encrypt](https://letsencrypt.org).
* Start the NGINX container:

  ```bash
  docker compose up jobmon_nginx --detach
  ```

* Check that NGINX container is running:

  ```bash
  docker ps --filter name=jobmon_nginx --format "{{.State}}"
  ```

## Cluster service: Collector for job metadata

* Generate an jobmon_backend API token. First login into the jobmon website with an account which has admin privileges. Go to the Admin tab, section API and push button "Generate API Key".
* Check that user "api" has permission "job-control".
  Go to the Admin tab, section Users and load information for user "api".
* The example script `scripts/jobmon_slurm` can be used to obtain job meta data from SLURM. Copy that script to `/etc/slurm/jobmon_slurm` on the cluster you want to monitor. In the script you have to configure:
  * `API_URL`: URL to the API endpoint e.g. `${BACKEND_URL}/api`. As all access to the jobmon_backend is routed through NGINX (see NGINX section), normally this URL correspondent to the NGINX address.
  * `X_AUTH_TOKEN`: Previously generated jobmon_backend API token.
* In `/etc/slurm/slurm.conf` you need to configure the script `/etc/slurm/jobmon_slurm` as SLURM control daemon prolog and epilog script:

  ```ini
  EpilogSlurmctld = /etc/slurm/jobmon_slurm
  PrologSlurmctld = /etc/slurm/jobmon_slurm
  ```

* Reconfigure SLURM to use this script:

  ```bash
  scontrol reconfigure
  ```

## Cluster Service: Collector for performance metrics

* Install [cc-metric-collector](https://github.com/ClusterCockpit/cc-metric-collector) on each cluster node.
* Configure the collected performance metrics in `/etc/cc-metric-collector/collectors.json`.
* Configure jobmon's InfluxDB in `/etc/cc-metric-collector/sinks.json`
  according to the settings in the InfluxDB section.

  ```json
  {
    "influxdb": {
      "password": "<authentication token for the performance metrics collector>",
      "host": "${INFLUXDB_HOST}",
      "port": "${INFLUXDB_PORT}",
      "database": "${INFLUXDB_BUCKET}",
      "organization": "{INFLUXDB_ORG}",
      "type": "influxdb",
      "batch_size": 50000,
      "flush_delay": "10s",
      "drop_rate": 10000,
      "meta_as_tags": [
        "unit"
      ]
    }
  }
  ```
