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

After setting the values in the `.env` and `backend/config.json` files, docker-compose can be used for easy deployment of the stack.

The `.env` file specifies the frontend database authentication keys as well as the ports the docker containers will run on.

The config.json contains the configuration for the backend as well as the metrics.

```bash
docker-compose up [-d]
```

## API Documentation

For further information about the available API endpoints, check out [doc/API.md](doc/API.md).
