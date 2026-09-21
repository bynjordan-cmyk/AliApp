#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Base Postgres local para desarrollo y pruebas de RLS, sin Docker.
#
# Uso:
#   ./scripts/db-local.sh start     arranca el clúster y aplica migraciones + seed
#   ./scripts/db-local.sh reset     borra el clúster y lo recrea desde cero
#   ./scripts/db-local.sh stop      para el clúster
#   ./scripts/db-local.sh psql      abre una sesión psql
#
# Si prefieres Supabase completo (Auth, Storage, Studio), usa `supabase start`
# y apunta ALIAPP_TEST_DATABASE_URL a esa base. Este script solo cubre Postgres.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${ALIAPP_PGDATA:-${TMPDIR:-/tmp}/aliapp-pgdata}"
PGPORT="${ALIAPP_PGPORT:-55432}"
PGDB="${ALIAPP_PGDATABASE:-aliapp_test}"
PGBIN="${ALIAPP_PGBIN:-/usr/lib/postgresql/16/bin}"
LOGFILE="${PGDATA}.log"

export PGHOST=127.0.0.1
export PGPORT

# Postgres se niega a arrancar como root. Si el shell es root (contenedores de
# CI, entornos remotos), delegamos los comandos del servidor en el usuario
# `postgres` del sistema.
if [ "$(id -u)" -eq 0 ] && id postgres >/dev/null 2>&1; then
  PG_RUNAS="postgres"
else
  PG_RUNAS=""
fi

run_pg() {
  if [ -n "$PG_RUNAS" ]; then
    su "$PG_RUNAS" -s /bin/bash -c "$1"
  else
    bash -c "$1"
  fi
}

start_cluster() {
  mkdir -p "$(dirname "$PGDATA")"
  if [ -n "$PG_RUNAS" ]; then
    chown "$PG_RUNAS" "$(dirname "$PGDATA")" 2>/dev/null || true
  fi

  if [ ! -d "$PGDATA" ]; then
    echo "→ initdb en $PGDATA"
    run_pg "'$PGBIN/initdb' -D '$PGDATA' -U postgres --auth=trust" >/dev/null
  fi
  if ! run_pg "'$PGBIN/pg_ctl' -D '$PGDATA' status" >/dev/null 2>&1; then
    echo "→ arrancando Postgres en el puerto $PGPORT"
    run_pg "'$PGBIN/pg_ctl' -D '$PGDATA' -l '$LOGFILE' -o '-p $PGPORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$PGDATA' -w start" >/dev/null
  fi
}

apply_schema() {
  psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -c "drop database if exists $PGDB" \
    -c "create database $PGDB"

  echo "→ aplicando sustituto de Supabase (solo pruebas)"
  psql -U postgres -d "$PGDB" -v ON_ERROR_STOP=1 -q -f "$ROOT/tests/db/supabase-shim.sql"

  echo "→ aplicando migraciones"
  for migration in "$ROOT"/supabase/migrations/*.sql; do
    echo "   · $(basename "$migration")"
    psql -U postgres -d "$PGDB" -v ON_ERROR_STOP=1 -q -f "$migration"
  done
}

apply_seed() {
  echo "→ aplicando seed de desarrollo"
  psql -U postgres -d "$PGDB" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed.sql"
}

case "${1:-start}" in
  start)
    start_cluster
    apply_schema
    apply_seed
    echo "✓ Base lista: postgresql://postgres@127.0.0.1:$PGPORT/$PGDB"
    ;;
  reset)
    run_pg "'$PGBIN/pg_ctl' -D '$PGDATA' -m immediate stop" >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    start_cluster
    apply_schema
    apply_seed
    echo "✓ Base recreada desde cero"
    ;;
  schema)
    start_cluster
    apply_schema
    echo "✓ Esquema aplicado (sin seed)"
    ;;
  stop)
    run_pg "'$PGBIN/pg_ctl' -D '$PGDATA' -m fast stop" >/dev/null 2>&1 || true
    echo "✓ Postgres detenido"
    ;;
  psql)
    start_cluster
    exec psql -U postgres -d "$PGDB"
    ;;
  *)
    echo "Uso: $0 {start|reset|schema|stop|psql}" >&2
    exit 1
    ;;
esac
