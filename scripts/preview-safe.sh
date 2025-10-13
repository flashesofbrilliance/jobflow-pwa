#!/usr/bin/env bash
set -euo pipefail

log(){ printf "\n[log] %s\n" "$*"; }
err(){ printf "\n[err] %s\n" "$*" >&2; }

log "PHASE 0 — Locate project"
if [ -d "$HOME/jobflow-pwa" ]; then cd "$HOME/jobflow-pwa";
elif [ -d "$HOME/omma.yaah" ]; then cd "$HOME/omma.yaah";
elif [ -d "$HOME/omma.yaah/web" ]; then cd "$HOME/omma.yaah/web";
else err "Could not find project folder. Run: cd <your-project-path>"; exit 1; fi

echo "PWD: $(pwd)"
echo "Node: $(node -v || echo 'node not found')  npm: $(npm -v || echo 'npm not found')"

log "PHASE 1 — Free common ports (optional)"
PORTS="5173 5174 5175 5176 4173 4174 4175 4176"
if command -v lsof >/dev/null 2>&1; then
  mapfile -t PIDS < <(lsof -ti tcp:$(echo $PORTS | sed 's/ /,tcp:/g') || true)
  if [ "${#PIDS[@]}" -gt 0 ]; then
    echo "Processes using preview/dev ports: ${PIDS[*]}"
    read -r -p "Kill these PIDs? [y/N] " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
      log "Sending SIGTERM to: ${PIDS[*]}"; kill "${PIDS[@]}" 2>/dev/null || true
      sleep 1
      mapfile -t PIDS2 < <(lsof -ti tcp:$(echo $PORTS | sed 's/ /,tcp:/g') || true)
      if [ "${#PIDS2[@]}" -gt 0 ]; then
        log "Forcing SIGKILL to stubborn PIDs: ${PIDS2[*]}"; kill -9 "${PIDS2[@]}" 2>/dev/null || true
      fi
    else
      log "Skipping port kill step."
    fi
  else
    log "No processes on $PORTS"
  fi
else
  log "lsof not found; skipping port checks"
fi

log "PHASE 2 — Install deps"
(npm ci || npm i)

log "PHASE 3 — Build"
npm run build

log "PHASE 4 — Preview"
PORT=4174
npm run preview -- --host 127.0.0.1 --port "$PORT" || { PORT=4175; npm run preview -- --host 127.0.0.1 --port "$PORT"; }

echo
echo ">>> Preview running. Open:  http://127.0.0.1:$PORT"
echo "If blank, open DevTools → Console and paste the first 20 lines back here."

