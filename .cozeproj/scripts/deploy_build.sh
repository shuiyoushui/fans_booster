#!/bin/bash

set -Eeuo pipefail

# 设置工作目录
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="${WORK_DIR}/social-media-automation"

echo "Starting build process for social media automation platform..."
echo "Working directory: ${WORK_DIR}"
echo "Project directory: ${PROJECT_DIR}"

# 检查项目目录是否存在
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "Error: Project directory ${PROJECT_DIR} does not exist!"
    exit 1
fi

# 进入项目目录
cd "${PROJECT_DIR}"

echo "Installing dependencies..."
npm ci

echo "Building Next.js application..."
npm run build

echo "Build process completed successfully!"
echo "Build output directory: ${PROJECT_DIR}/.next"