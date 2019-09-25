#!/bin/bash
if [ -d ".git" ]; then
  if [ ! -d ".git/hooks" ]; then
    echo "Hooks directory not found, creating it"
    mkdir .git/hooks
  fi
  for HOOK_PATH in scripts/githooks/*
  do
    HOOK_NAME=`basename $HOOK_PATH`
    echo "Installing git hook: $HOOK_NAME"
    cp "$HOOK_PATH" ".git/hooks/$HOOK_NAME"
    chmod +x ".git/hooks/$HOOK_NAME"
  done
fi
