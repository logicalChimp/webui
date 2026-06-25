#!/bin/bash
set -e

# Read version from package.json, stripping any .dev suffix
VERSION=$(node -p "require('./package.json').version.replace(/\.dev$/, '')")

if [ ! -d node_modules ]; then
  echo "node_modules not found, running yarn install..."
  yarn install --frozen-lockfile
fi

echo "Building version $VERSION..."
NODE_ENV=production BABEL_ENV=production VERSION="$VERSION" yarn webpack

echo ""
zip -r dist.zip ./dist
echo "Build complete: dist/ and dist.zip"
