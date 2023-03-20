#!/bin/bash

# Build jobmon backend
sudo docker build --pull --target dev_env --tag jobmon_backend_dev_env  backend

# Build jobmon frontend
sudo docker build --pull --target dev_env --tag jobmon_frontend_dev_env frontend

# close previous sessions
tmux kill-session -t jobmon_dev

# Start new jobmon development session
tmux new-session -c backend -d -s jobmon_dev
tmux split-window -c frontend -h

# Start jobmon frontend and backend in this session
tmux send -t jobmon_dev:0.0  \
"sudo docker run \
    --interactive \
    --tty \
    --mount=type=volume,source=jobmon_backend_cache_go_build,target=/root/.cache/go-build \
    --mount=type=bind,source=./,target=/app \
    jobmon_backend_dev_env" C-m
tmux send -t jobmon_dev:0.1 "sudo docker run \
    --interactive \
    --tty \
    --mount=type=bind,source=./,target=/app  \
    --mount=type=volume,source=jobmon_frontend_nodes_modules,target=/app/node_modules \
    jobmon_frontend_dev_env" C-m

# Attache to the session
tmux attach-session -t jobmon_dev
