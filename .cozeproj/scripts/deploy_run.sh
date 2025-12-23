#!/bin/bash

set -Eeuo pipefail

# 设置工作目录
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="${WORK_DIR}/social-media-automation"

# 检查并清理端口
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

# 启动服务
start_service() {
    echo "Starting social media automation platform on port ${DEPLOY_RUN_PORT}..."
    echo "Project directory: ${PROJECT_DIR}"
    
    # 检查环境变量
    if [ -z "${DEPLOY_RUN_PORT}" ]; then
        echo "Error: DEPLOY_RUN_PORT is not set!"
        exit 1
    fi
    
    # 检查构建文件
    if [ ! -f "${PROJECT_DIR}/.next/BUILD_ID" ]; then
        echo "Error: Build files not found. Please run build first!"
        exit 1
    fi
    
    cd "${PROJECT_DIR}"
    
    # 设置生产环境变量
    export NODE_ENV=production
    
    # 启动Next.js服务
    echo "Starting Next.js server..."
    npm start -- --port ${DEPLOY_RUN_PORT}
}

# 主执行流程
echo "Clearing port ${DEPLOY_RUN_PORT} before start..."
kill_port_if_listening

echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for social media automation platform..."
start_service