#!/bin/bash

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
