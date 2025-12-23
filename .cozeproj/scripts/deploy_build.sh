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
cd "$WORK_DIR/social-media-automation"

# 检查是否有虚拟环境，如果没有则创建
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source "$WORK_DIR/social-media-automation/venv/bin/activate"

# 升级pip
pip install --upgrade pip

# 安装基本的Python依赖，使用更新的版本避免兼容性问题
echo "安装FastAPI和核心依赖..."
pip install fastapi==0.104.1 uvicorn==0.24.0 nest-asyncio==1.5.6 python-dotenv==1.0.0 pydantic==1.10.13

# 尝试安装更新的aiohttp版本
echo "安装aiohttp..."
pip install aiohttp>=3.9.0 || echo "aiohttp安装失败，将使用模拟数据"

echo "项目构建完成！"