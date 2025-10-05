#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Deploying JobFlow PWA to GitHub Pages..."

# Resolve project root (this script lives in scripts/)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Preflight
for cmd in node npm git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ $cmd not found. Please install it first."
    exit 1
  fi
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Not a git repository. Initialize git and set a remote."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ No 'origin' remote configured. Add one with: git remote add origin <url>"
  exit 1
fi

# Ensure dependencies
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm ci || npm install
fi

# Build production bundle
echo "🏗️  Building production bundle..."
npm run build

if [ ! -d dist ]; then
  echo "❌ Build output directory 'dist' not found."
  exit 1
fi

# Optional CNAME support
BRANCH="${GH_PAGES_BRANCH:-gh-pages}"
MESSAGE="${GH_PAGES_MESSAGE:-Deploy $(date '+%Y-%m-%d %H:%M:%S')}"
CNAME_VALUE="${GH_PAGES_CNAME:-}"

EXTRA_ARGS=()
EXTRA_ARGS+=("-b" "$BRANCH")
EXTRA_ARGS+=("-m" "$MESSAGE")

if [ -n "$CNAME_VALUE" ]; then
  EXTRA_ARGS+=("-n" "$CNAME_VALUE")
elif [ -f "public/CNAME" ]; then
  # gh-pages supports -n to write CNAME, but if a file exists we can copy it
  cp public/CNAME dist/CNAME
fi

ORIGIN_URL=$(git remote get-url origin)
echo "🌐 Using remote: $ORIGIN_URL (branch: $BRANCH)"

echo "📤 Publishing 'dist' via gh-pages..."
npx gh-pages -d dist "${EXTRA_ARGS[@]}"

echo "✅ Deploy complete. Pushed to branch: $BRANCH"
echo "🔗 Check your repository Settings → Pages for the live URL."

