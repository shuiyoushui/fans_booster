#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

start_service() {
    echo "Changing to project directory..."
    cd "$WORK_DIR/social-media-automation"
    
    echo "Starting Next.js production server on port ${DEPLOY_RUN_PORT}..."
    echo "Environment: NODE_ENV=production"
    
    # Start the production server
    NODE_ENV=production npm run start -- --port "${DEPLOY_RUN_PORT}"
}

echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service