#!/usr/bin/env bash

set -euo pipefail

REQUEST_ID='1'
HOSTNAME=

_request() {
  local request_id="$1"
  local output response counter version pod
  # echo "request $request_id: start"
  if output="$(curl -fis "http://$HOSTNAME/counter/1/inc")"; then
    response="$( (grep ^HTTP | cut -d ' ' -f 2- | tr -d $'\r') <<<"$output")"
    version="$( (grep ^\{ | jq -r .metadata.version) <<<"$output")"
    pod="$( (grep ^\{ | jq -r .metadata.hostname) <<<"$output")"
    counter="$( (grep ^\{ | jq -r .counter) <<<"$output")"
    echo "request $request_id: response: $response, counter: $counter, pod: $pod, version: $version"
  else
    response="$( (grep ^HTTP | cut -d ' ' -f 2- | tr -d $'\r') <<<"$output")"
    echo "request $request_id: ERROR: $response"
  fi
  sleep 1
}

if [ $# -lt 1 ]; then
  echo "Usage: $0 HOSTNAME" >&2
  exit 1
fi

HOSTNAME="$1"

while :; do
  _request $REQUEST_ID
  REQUEST_ID=$((REQUEST_ID+1))
done
