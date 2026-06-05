#!/bin/bash
# Assemblies of God Financial System - Startup Script

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=== Assemblies of God Financial System ==="
echo ""

# Install backend dependencies
echo "[1/4] Installing backend dependencies..."
cd "$BACKEND_DIR"
pip install -r requirements.txt -q

# Seed database
echo "[2/4] Initializing database with seed data..."
python seed.py

# Install frontend dependencies
echo "[3/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent

echo "[4/4] Starting services..."
echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Default login: admin / admin123"
echo ""

# Start backend in background
cd "$BACKEND_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo "Press Ctrl+C to stop both services"

cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}

trap cleanup INT TERM
wait
