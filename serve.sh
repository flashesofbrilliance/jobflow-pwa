#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PORT=${1:-5173}
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  PORT=8000
fi

echo "Serving JobFlow from $(pwd)"
echo "Trying to bind http://127.0.0.1:$PORT ..."

if command -v python3 >/dev/null 2>&1; then
  echo "Using python3 http.server"
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
fi

if command -v python >/dev/null 2>&1; then
  echo "Using python SimpleHTTPServer"
  exec python -m SimpleHTTPServer "$PORT"
fi

if command -v ruby >/dev/null 2>&1; then
  echo "Using ruby -run httpd"
  exec ruby -run -e httpd . -p "$PORT" -b 127.0.0.1
fi

if command -v php >/dev/null 2>&1; then
  echo "Using php -S"
  exec php -S 127.0.0.1:"$PORT" -t .
fi

echo "No suitable static server found (python3/python/ruby/php). Install one and retry."
exit 1

