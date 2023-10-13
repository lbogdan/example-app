#!/bin/bash

set -euo pipefail

IMAGE_REGISTRY="ghcr.io"
IMAGE_NAME="${IMAGE_REGISTRY}/lbogdan/example-app"
PULL=""

if ! git status | grep -q 'working tree clean'; then
  echo "ERROR: There are uncomitted changes." >&2
  exit 1
fi

if ! TAG="$(git describe --exact-match --tags 2>/dev/null)"; then
  echo "ERROR: Missing tag." >&2
  exit 1
fi

while [ "$#" -ne 0 ]; do
  case "$1" in
    --pull)
      PULL="1"
  esac
  shift
done

docker build -t "$IMAGE_NAME:$TAG" .

if [ -n "$PULL" ]; then
  docker pull "$IMAGE_NAME:$TAG"
fi
