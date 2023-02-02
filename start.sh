#!/bin/bash
tmux kill-session -t jobmon_dev
tmux new-session -c backend -d -s jobmon_dev
tmux split-window -c frontend -h
tmux send -t jobmon_dev:0.0 "go run ." C-m
tmux send -t jobmon_dev:0.1 "yarn dev" C-m
tmux attach-session -t jobmon_dev
