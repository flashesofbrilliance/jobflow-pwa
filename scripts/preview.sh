#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Preflight checks..."

# Detect project root (this script lives in scripts/)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Required commands
for cmd in node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ $cmd not found. Please install it first."
    exit 1
  fi
done

# Optional: Tauri/Rust (only if you’re packaging desktop)
if [ -f "src-tauri/tauri.conf.json" ]; then
  if ! command -v cargo >/dev/null 2>&1; then
    echo "❌ Rust toolchain missing. Install via https://rustup.rs"
    exit 1
  fi
fi

echo "🧹 Cleaning old builds..."
rm -rf node_modules dist .vite .tauri-build 2>/dev/null || true

echo "📦 Installing dependencies..."
npm ci || npm install

echo "🏗️  Building production bundle..."
npm run build

echo "🚀 Launching local preview (Vite)..."
PORT=${1:-5174}
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "⚠️  Port $PORT busy. Switching to 5001..."
  PORT=5001
fi

npx vite preview --port $PORT --host 0.0.0.0 &
PREVIEW_PID=$!

echo $PREVIEW_PID > "$PROJECT_DIR/dev.pid"
echo "✅ Preview running on http://localhost:$PORT"
echo "🧭 Use Ctrl+C to stop, or run: kill $(cat "$PROJECT_DIR/dev.pid")"

