#!/bin/bash
set -e

echo "Building Lambda deployment package..."

# Clean previous build
rm -rf lambda-dist
mkdir -p lambda-dist

# Copy compiled code
cp -r dist/* lambda-dist/

# Install production dependencies
cp package.json.lambda lambda-dist/package.json
cd lambda-dist
npm install --production --no-package-lock
rm package.json

echo "✅ Lambda package built in lambda-dist/"
