#!/bin/bash

# Enhanced cleanup script for Next.js builds
echo "Starting enhanced cleanup process..."

# Force remove all build artifacts
echo "Removing .next directory"
rm -rf .next

# Clean npm cache if needed
echo "Cleaning npm cache"
npm cache clean --force

# Remove node_modules if needed (uncomment if you want a complete rebuild)
# echo "Removing node_modules"
# rm -rf node_modules

echo "Removing any temporary files"
find . -name "*.tmp" -delete
find . -name ".*.swp" -delete

# On Windows, sometimes processes lock files - try to release them
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "Windows environment detected, trying to release file locks"
    taskkill //F //IM node.exe > /dev/null 2>&1 || true
fi

echo "Cleanup complete. Ready for fresh build."
