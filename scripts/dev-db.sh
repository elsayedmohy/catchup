#!/usr/bin/env bash
# Manages a user-owned PostgreSQL cluster for local development.
# This avoids needing root access or a system-wide PostgreSQL password.
#
# Usage:
#   ./scripts/dev-db.sh start   # initialise (first run) and start on port 5433
#   ./scripts/dev-db.sh stop    # stop the cluster
#   ./scripts/dev-db.sh status  # show whether it is running
#   ./scripts/dev-db.sh reset   # stop, delete data, and recreate empty databases
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT/.devdata/pg"
LOG_FILE="$ROOT/.devdata/pg.log"
SOCKET_DIR="$ROOT/.devdata"
PORT="${CATCHUP_PG_PORT:-5433}"
DB_USER="postgres"
DB_PASS="postgres"
DATABASES=("catchup" "catchup_test")

psql_cmd() {
  PGPASSWORD="$DB_PASS" psql -U "$DB_USER" -h 127.0.0.1 -p "$PORT" "$@"
}

is_running() {
  pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1
}

start() {
  mkdir -p "$SOCKET_DIR"

  if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    echo "Initialising new PostgreSQL cluster in $DATA_DIR"
    initdb -D "$DATA_DIR" -U "$DB_USER" --auth=trust >/dev/null
  fi

  if is_running; then
    echo "PostgreSQL is already running on port $PORT."
    return
  fi

  echo "Starting PostgreSQL on port $PORT..."
  pg_ctl -D "$DATA_DIR" -l "$LOG_FILE" -o "-p $PORT -k $SOCKET_DIR" start >/dev/null

  # Wait for the server to accept connections
  for _ in $(seq 1 30); do
    if psql_cmd -c 'SELECT 1' >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done

  for db in "${DATABASES[@]}"; do
    if ! psql_cmd -lqt | cut -d '|' -f 1 | grep -qw "$db"; then
      psql_cmd -c "CREATE DATABASE \"$db\";" >/dev/null
      echo "Created database $db"
    fi
  done

  echo "PostgreSQL ready:  postgresql://$DB_USER:$DB_PASS@127.0.0.1:$PORT/catchup"
}

stop() {
  if is_running; then
    pg_ctl -D "$DATA_DIR" stop >/dev/null
    echo "PostgreSQL stopped."
  else
    echo "PostgreSQL is not running."
  fi
}

status() {
  if is_running; then
    echo "PostgreSQL is running on port $PORT."
  else
    echo "PostgreSQL is not running."
  fi
}

reset() {
  stop || true
  rm -rf "$DATA_DIR"
  start
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  reset) reset ;;
  *)
    echo "Usage: $0 {start|stop|status|reset}" >&2
    exit 1
    ;;
esac
