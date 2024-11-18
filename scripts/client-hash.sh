#!/usr/bin/env bash

set -euo pipefail

REQUEST_ID='1'
COUNT=1
SLEEP=0
HOSTNAME=

_request() {
  local request_id="$1"
  local output response took version pod
  # echo "request $request_id: start"
  if output="$( (time curl -fi "http://$HOSTNAME/hash/test") 2>&1)"; then
    response="$( (grep ^HTTP | cut -d ' ' -f 2- | tr -d $'\r') <<<"$output")"
    took="$( (grep ^real | cut -d $'\t' -f 2) <<<"$output")"
    version="$( (grep ^\{ | jq -r .metadata.version) <<<"$output")"
    pod="$( (grep ^\{ | jq -r .metadata.hostname) <<<"$output")"
    echo "request $request_id: response: $response, pod: $pod, version: $version, took: $took"
  else
    response="$( (grep ^HTTP | cut -d ' ' -f 2- | tr -d $'\r') <<<"$output")"
    echo "request $request_id: ERROR: $response"
  fi
  if [ "$SLEEP" -gt 0 ]; then
    sleep "$SLEEP"
  fi
}

if [ $# -lt 1 ]; then
  echo "Usage: $0 HOSTNAME [--count COUNT] [--sleep SLEEP]" >&2
  exit 1
fi

HOSTNAME="$1"
shift

while [ $# -gt 0 ]; do
  case "$1" in
    --count)
      COUNT="$2"
      shift 2
      ;;
    --sleep)
      SLEEP="$2"
      shift 2
      ;;
    *)
      echo "ERROR: invalid argument: $1" >&2
      exit 1
  esac
done

while :; do
  if [ "$COUNT" -gt 1 ]; then
    for _i in $(seq 1 $((COUNT-1))); do
      _request $REQUEST_ID &
      REQUEST_ID=$((REQUEST_ID+1))
    done
  fi
  _request $REQUEST_ID
  REQUEST_ID=$((REQUEST_ID+1))
  if [ "$COUNT" -gt 1 ]; then
    for _i in $(seq 1 $((COUNT-1))); do
      wait
    done
  fi
done
