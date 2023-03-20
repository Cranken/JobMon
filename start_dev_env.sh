#!/bin/bash

# Installe required node.js modules
cd frontend
if [[ -f yarn.lock ]]; then
    yarn --frozen-lockfile
elif [[ -f package-lock.json ]]; then
     npm ci
elif [ -f pnpm-lock.yaml ]; then
     yarn global add pnpm && pnpm i --frozen-lockfile
else
    echo "Lockfile not found." && exit 1
fi
cd -

# Build jobmon backend
sudo docker build --pull --target dev_env --tag jobmon_backend_dev_env backend

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
tmux send -t jobmon_dev:0.1 "yarn dev" C-m

# Attache to the session
tmux attach-session -t jobmon_dev
