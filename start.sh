#!/bin/bash

# MatchCoreArena Client Startup Script

set -e

echo "🎮 MatchCoreArena Client"
echo "========================"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.25+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Wails is installed
if ! command -v wails &> /dev/null; then
    echo "⚠️  Wails CLI not found. Installing..."
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
fi

# Install dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Install Go dependencies
echo "📦 Installing Go dependencies..."
go mod tidy

# Check for configuration
if [ ! -f "$HOME/.matchcorearena/config.json" ]; then
    echo "⚙️  Creating default configuration..."
    mkdir -p "$HOME/.matchcorearena"
    cp config.example.json "$HOME/.matchcorearena/config.json"
    echo "📝 Configuration created at ~/.matchcorearena/config.json"
    echo "   Please edit this file to set your server URL."
fi

# Run the application
echo "🚀 Starting MatchCoreArena Client..."
wails dev