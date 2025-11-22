#!/bin/bash
# Production startup script for macOS/Linux
# This script builds both frontend and backend, then starts the server

echo "🚀 Building GitHub Commit Workspace Runner..."

# Build frontend with Vite
echo "📦 Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"

# Start the server (backend will serve the frontend)
echo "🎉 Starting server..."
echo "📡 Server will be available at http://localhost:4000"

npm run server
