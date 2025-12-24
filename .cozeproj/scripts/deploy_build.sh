#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Building social media automation platform..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# 进入项目目录
cd "$WORK_DIR/social-media-automation"

# 安装依赖
echo "Installing dependencies..."
npm ci

# 构建项目
echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"