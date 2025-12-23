#!/bin/bash

set -Eeuo pipefail

# 获取工作目录
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="${WORK_DIR}/social-media-automation"

echo "Starting build process..."
echo "Work directory: ${WORK_DIR}"
echo "Project directory: ${PROJECT_DIR}"

# 检查项目目录是否存在
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "Error: Project directory not found at ${PROJECT_DIR}"
    exit 1
fi

# 切换到项目目录
cd "${PROJECT_DIR}"

# 安装依赖
echo "Installing dependencies..."
npm install

# 构建项目
echo "Building project..."
npm run build

# 创建数据目录（如果不存在）
mkdir -p data

echo "Build process completed successfully!"