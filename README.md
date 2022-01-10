## Prerequesites

Per Node Metrics are collected by the [ClusterCockpit Metric Collector](https://github.com/ClusterCockpit/cc-metric-collector/).  
Slurm Job Data is collected by the `jobmon_slurm` Prolog/Epilog script in `/scripts`. However, this is only serves as an example.

## Development Setup

The config must have been adjusted beforehand.  
Node version should be > 16.11.12  
Yarn should have been installed globally.

The easiest way is to use two terminals.  
Terminal 1:

```
go run .
```

Terminal 2:

```
cd jobmon
yarn
yarn dev
```

The frontend should be available at: http://localhost:3000

## Production Use

After setting the values in the .env and config.json file docker-compose can be used for easy deployment of the stack.

```
docker-compose up [-d]
```
