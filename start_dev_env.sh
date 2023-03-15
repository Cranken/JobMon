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

# close previous sessions
tmux kill-session -t jobmon_dev

# Start new jobmon development session
tmux new-session -c backend -d -s jobmon_dev
tmux split-window -c frontend -h

# Start jobmon frontend and backend in this session
tmux send -t jobmon_dev:0.0 "go run ." C-m
tmux send -t jobmon_dev:0.1 "yarn dev" C-m

# Attache to the session
tmux attach-session -t jobmon_dev
