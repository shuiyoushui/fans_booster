#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/social-media-automation"

echo "开始构建项目..."

# 构建Next.js项目
echo "安装前端依赖..."
npm install

echo "构建前端项目..."
npm run build

# 安装Python依赖
echo "安装Python依赖..."
cd twitter_service

# 检查并安装核心依赖
pip3 install --upgrade pip

# 安装基本的Python依赖，跳过有问题的包
echo "安装FastAPI和核心依赖..."
pip3 install fastapi uvicorn nest-asyncio aiohttp python-dotenv pydantic

echo "项目构建完成！"