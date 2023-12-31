#!/bin/bash

set -euo pipefail

IMAGE_REGISTRY="ghcr.io"
IMAGE_NAME="${IMAGE_REGISTRY}/lbogdan/example-app"
PUSH=""

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
    --push)
      PUSH="1"
      ;;
    *)
      echo "ERROR: unknown argument \"$1\"." >&2
      exit 1
  esac
  shift
done

docker build --build-arg="VERSION=$TAG" --tag="$IMAGE_NAME:$TAG" .

if [ -n "$PUSH" ]; then
  docker push "$IMAGE_NAME:$TAG"
fi
