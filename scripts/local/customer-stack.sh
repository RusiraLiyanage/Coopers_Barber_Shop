#!/usr/bin/env bash
# Start the local customer-facing stack behind booking-guard.
set -euo pipefail

COMMAND="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCREEN_BIN="$(command -v screen || true)"

if [ -z "$SCREEN_BIN" ]; then
  echo "screen is required to run the local stack in detached sessions." >&2
  exit 1
fi

run_screen() {
  local name="$1"
  local command="$2"

  "$SCREEN_BIN" -S "$name" -X quit >/dev/null 2>&1 || true
  "$SCREEN_BIN" -dmS "$name" zsh -lc "$command"
}

stop_screen() {
  local name="$1"
  "$SCREEN_BIN" -S "$name" -X quit >/dev/null 2>&1 || true
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local attempts=40

  for _ in $(seq 1 "$attempts"); do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$label is listening on $port"
      return 0
    fi

    sleep 1
  done

  echo "$label did not start on port $port. Check /tmp/coopers-$label.log" >&2
  return 1
}

start_stack() {
  mkdir -p /tmp/coopers-local

  run_screen \
    "coopers-customer-vite" \
    "cd '$ROOT_DIR/Frontend/appointment-booking-frontend' && npm run dev -- --host 127.0.0.1 --port 5173 > /tmp/coopers-customer-vite.log 2>&1"

  run_screen \
    "coopers-booking-api" \
    "cd '$ROOT_DIR/Backend' && pnpm booking:api > /tmp/coopers-booking-api.log 2>&1"

  run_screen \
    "coopers-auth-api" \
    "cd '$ROOT_DIR/Backend' && pnpm auth:api > /tmp/coopers-auth-api.log 2>&1"

  run_screen \
    "coopers-admin-api" \
    "cd '$ROOT_DIR/Backend' && pnpm admin:api > /tmp/coopers-admin-api.log 2>&1"

  run_screen \
    "coopers-booking-guard" \
    "cd '$ROOT_DIR/Backend' && pnpm booking:guard > /tmp/coopers-booking-guard.log 2>&1"

  wait_for_port 5173 "customer-vite"
  wait_for_port 7310 "booking-api"
  wait_for_port 7312 "auth-api"
  wait_for_port 7313 "admin-api"
  wait_for_port 7311 "booking-guard"

  echo "Customer app: http://localhost:7311"
}

stop_stack() {
  stop_screen "coopers-customer-vite"
  stop_screen "coopers-booking-api"
  stop_screen "coopers-auth-api"
  stop_screen "coopers-admin-api"
  stop_screen "coopers-booking-guard"
  echo "Stopped local customer stack."
}

status_stack() {
  "$SCREEN_BIN" -ls || true
  echo
  lsof -nP -iTCP:5173 -sTCP:LISTEN || true
  lsof -nP -iTCP:7310 -sTCP:LISTEN || true
  lsof -nP -iTCP:7311 -sTCP:LISTEN || true
  lsof -nP -iTCP:7312 -sTCP:LISTEN || true
  lsof -nP -iTCP:7313 -sTCP:LISTEN || true
}

case "$COMMAND" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  status)
    status_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}" >&2
    exit 1
    ;;
esac
