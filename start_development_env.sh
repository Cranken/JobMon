#!/bin/bash

function clear_dev_env() {
    sudo docker system prune --all --volumes
    sudo docker volume rm \
        jobmon_backend_cache_go_build \
        jobmon_backend_cache_go_packages \
        jobmon_frontend_nextjs \
        jobmon_frontend_nodes_modules
    echo "Docker images:"
    sudo docker images ls
    echo "Docker containers:"
    sudo docker container ls
    echo "Docker volumes:"
    sudo docker volume ls
}

SUDO="sudo"
REGEX_DOCKER_GROUP='[(]docker[)]'
if [[ "$(id)" =~ ${REGEX_DOCKER_GROUP} ]]; then
    unset SUDO
fi

# Rebuild development environment containers
eval ${SUDO} docker compose --file docker-compose.development.yml build --pull

# Start develepment environmemnt services
eval ${SUDO} \
  DO_VET=true \
  DO_STATICCHECK=true \
  DO_PKG_UPDATE=false \
  DO_TESTS=false \
  docker compose --file docker-compose.development.yml up
