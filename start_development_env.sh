#!/bin/bash

function clear_dev_env() {
    sudo docker system prune --all --volumes
    sudo docker volume rm \
        jobmon_frontend_nodes_modules \
        jobmon_backend_cache_go_build \
        jobmon_backend_cache_go_packages
    echo "Docker images:"
    sudo docker images ls
    echo "Docker containers:"
    sudo docker container ls
    echo "Docker volumes:"
    docker volume ls
}

# Rebuild development environment containers
sudo docker compose --file docker-compose.development.yml build --pull

# Start develepment environmemnt services
sudo docker compose --file docker-compose.development.yml up
