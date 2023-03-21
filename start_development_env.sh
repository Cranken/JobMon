#!/bin/bash

# Rebuild development environment containers
sudo docker compose --file docker-compose.development.yml build --pull

# Start develepment environmemnt services
sudo docker compose --file docker-compose.development.yml up