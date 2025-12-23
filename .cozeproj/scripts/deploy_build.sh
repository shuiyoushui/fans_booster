#!/bin/bash

set -Eeuo pipefail

WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Working directory: $WORK_DIR"
cd "$WORK_DIR/social-media-automation"

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project
echo "Building Next.js application..."
npm run build

echo "Build completed successfully!"