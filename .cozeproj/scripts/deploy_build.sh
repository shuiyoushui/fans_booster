set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$WORK_DIR/social-media-automation"

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Build completed successfully!"