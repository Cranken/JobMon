## Prerequesites

Per Node Metrics are collected by the [ClusterCockpit Metric Collector](https://github.com/ClusterCockpit/cc-metric-collector/).  
Slurm Job Data is collected by the `jobmon_slurm` Prolog/Epilog script in `/scripts`. However, this is only serves as an example.

## Development Setup

The config and .env must have been adjusted beforehand.

Node version should be >= 16.11.12.  
Go version needs to be >= 1.18.

Yarn should have been installed globally.

The easiest way is to use two terminals.  
Terminal 1:

```
cd backend
go get
go run .
```

Terminal 2:

```
cd frontend
yarn
yarn dev
```

The frontend should be available at: http://localhost:3000

## Production Use

After setting the values in the .env and config.json file docker-compose can be used for easy deployment of the stack.

The .env file specifies the frontend database authentication keys as well as the ports the docker containers will run on.

The config.json contains the configuration for the backend as well as the metrics.

```
docker-compose up [-d]
```

## API Documentation

For further information about the available API endpoints check [doc/API.md](doc/API.md).