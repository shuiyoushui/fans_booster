#!/bin/bash

set -Eeuo pipefail

# 获取工作目录
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="${WORK_DIR}/social-media-automation"

# 清理端口占用函数
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

# 启动服务函数
start_service() {
    echo "Starting HTTP service on port ${DEPLOY_RUN_PORT}..."
    echo "Project directory: ${PROJECT_DIR}"
    echo "DEPLOY_RUN_PORT: ${DEPLOY_RUN_PORT}"
    
    # 检查环境变量
    if [ -z "${DEPLOY_RUN_PORT}" ]; then
        echo "Error: DEPLOY_RUN_PORT environment variable is not set"
        exit 1
    fi
    
    # 切换到项目目录
    cd "${PROJECT_DIR}"
    
    # 确保数据目录存在
    mkdir -p data
    
    # 设置环境变量
    export NODE_ENV=production
    export PORT=${DEPLOY_RUN_PORT}
    
    # 启动服务
    echo "Starting Next.js production server..."
    npm start
}

echo "Starting deployment..."

# 清理端口占用
echo "Clearing port ${DEPLOY_RUN_PORT} before start."
kill_port_if_listening

# 启动服务
echo "Starting HTTP service on port ${DEPLOY_RUN_PORT} for deploy..."
start_service