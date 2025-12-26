#!/bin/bash

# Soora Express - Start Script
# Starts both backend and frontend in separate terminal windows

echo "🚀 Starting Soora Express..."

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if backend is set up
if [ ! -d "$DIR/backend/node_modules" ]; then
    echo "❌ Backend not set up. Run './setup.sh' first."
    exit 1
fi

# Check if frontend is set up
if [ ! -d "$DIR/node_modules" ]; then
    echo "❌ Frontend not set up. Run './setup.sh' first."
    exit 1
fi

# Start backend in new terminal
echo "Starting backend server..."
osascript -e "tell application \"Terminal\" to do script \"cd '$DIR/backend' && npm run dev\""

# Wait a bit for backend to start
sleep 2

# Start frontend in new terminal
echo "Starting frontend server..."
osascript -e "tell application \"Terminal\" to do script \"cd '$DIR' && npm run dev\""

echo ""
echo "✅ Servers starting in separate terminal windows..."
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Admin:    http://localhost:3000/admin"
echo ""
echo "👤 Admin Login:"
echo "   Email:    Soora@admin.com"
echo "   Password: Admin@soora"
echo ""
