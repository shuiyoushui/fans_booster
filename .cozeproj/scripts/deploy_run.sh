#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/social-media-automation"

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

# 清理Python服务端口（8000）
kill_python_service() {
    local python_pids
    python_pids=$(ss -H -lntp 2>/dev/null | awk -v port="8000" '$4 ~ ":8000"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${python_pids}" ]]; then
      echo "Python service port 8000 in use by PIDs: ${python_pids} (SIGKILL)"
      echo "${python_pids}" | xargs -I {} kill -9 {}
      sleep 1
    fi
}

start_services() {
    echo "清理端口..."
    kill_port_if_listening
    kill_python_service
    
    echo "启动Python Twitter数据采集服务..."
    cd twitter_service
    
    # 检查虚拟环境是否存在
    if [ ! -d "../venv" ]; then
        echo "虚拟环境不存在，请先运行构建脚本"
        exit 1
    fi
    
    # 激活虚拟环境并启动服务
    source ../venv/bin/activate
    nohup python simple_main.py > python_service.log 2>&1 &
    PYTHON_PID=$!
    echo "Python服务启动，PID: $PYTHON_PID"
    
    # 等待Python服务启动
    sleep 3
    
    # 检查Python服务是否正常
    if curl -s http://localhost:8000/ > /dev/null; then
        echo "✓ Python服务启动成功"
    else
        echo "✗ Python服务启动失败，请检查日志: python_service.log"
    fi
    
    cd ..
    
    echo "启动Next.js服务..."
    echo "服务将在端口 ${DEPLOY_RUN_PORT} 启动..."
    
    # 使用生产模式启动
    npm start -- --port ${DEPLOY_RUN_PORT} &
    NODE_PID=$!
    
    echo "Next.js服务启动，PID: $NODE_PID"
    
    # 等待Next.js服务启动
    sleep 5
    
    echo "所有服务已启动："
    echo "- Python服务: http://localhost:8000 (PID: $PYTHON_PID)"
    echo "- Next.js服务: http://localhost:${DEPLOY_RUN_PORT} (PID: $NODE_PID)"
    echo ""
    echo "📊 Twitter数据采集服务: http://localhost:${DEPLOY_RUN_PORT}"
    echo "🔧 API管理界面: http://localhost:8000/docs"
    echo ""
    echo "查看Python服务日志: tail -f twitter_service/python_service.log"
}

echo "启动HTTP服务..."
start_services