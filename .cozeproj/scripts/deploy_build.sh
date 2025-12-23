set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$WORK_DIR/social-media-automation"

echo "Building social media automation application..."

# 进入项目目录
cd "$PROJECT_DIR"

# 安装依赖
echo "Installing dependencies..."
npm install

# 构建项目
echo "Building application..."
npm run build

echo "Build completed successfully!"