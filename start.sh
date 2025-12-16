#!/usr/bin/env bash
# 一键启动前后端（dev）脚本，自动准备依赖与日志。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
VENV_DIR="$ROOT/.venv"
BACKEND_PID_FILE="$ROOT/.backend.pid"
FRONTEND_PID_FILE="$ROOT/.frontend.pid"
BACKEND_PORT="${PORT:-${FLASK_RUN_PORT:-5001}}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

log() {
  printf "[start] %s\n" "$*"
}

is_running() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

stop_service() {
  local name="$1" pid_file="$2"
  if is_running "$pid_file"; then
    local pid
    pid="$(cat "$pid_file")"
    log "Stopping $name (pid $pid)"
    kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  fi
}

ensure_venv() {
  if [ ! -d "$VENV_DIR" ]; then
    log "Creating Python venv at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip
    pip install -r "$BACKEND_DIR/requirements.txt"
  else
    # shellcheck source=/dev/null
    source "$VENV_DIR/bin/activate"
  fi
}

ensure_frontend() {
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Installing frontend deps (npm ci)"
    (cd "$FRONTEND_DIR" && npm ci)
  fi
}

start_backend() {
  if is_running "$BACKEND_PID_FILE"; then
    log "Backend already running (pid $(cat "$BACKEND_PID_FILE"))"
    return
  fi
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
  log "Starting backend on port $BACKEND_PORT (log: $ROOT/backend.log)"
  (cd "$BACKEND_DIR" && PORT="$BACKEND_PORT" python app.py >"$ROOT/backend.log" 2>&1 & echo $! >"$BACKEND_PID_FILE")
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE"; then
    log "Frontend already running (pid $(cat "$FRONTEND_PID_FILE"))"
    return
  fi
  log "Starting frontend dev server on port $FRONTEND_PORT (log: $ROOT/frontend.log)"
  (cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" >"$ROOT/frontend.log" 2>&1 & echo $! >"$FRONTEND_PID_FILE")
}

stop_all() {
  stop_service "backend" "$BACKEND_PID_FILE"
  stop_service "frontend" "$FRONTEND_PID_FILE"
}

status() {
  if is_running "$BACKEND_PID_FILE"; then
    log "Backend running (pid $(cat "$BACKEND_PID_FILE")) on port $BACKEND_PORT"
  else
    log "Backend not running"
  fi
  if is_running "$FRONTEND_PID_FILE"; then
    log "Frontend running (pid $(cat "$FRONTEND_PID_FILE")) on port $FRONTEND_PORT"
  else
    log "Frontend not running"
  fi
}

case "${1:-start}" in
  start)
    stop_all
    ensure_venv
    ensure_frontend
    start_backend
    start_frontend
    log "All services started. Backend: http://localhost:$BACKEND_PORT  Frontend: http://localhost:$FRONTEND_PORT"
    ;;
  stop)
    stop_all
    log "Services stopped."
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 [start|stop|status]"
    exit 1
    ;;
esac
