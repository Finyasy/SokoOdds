#!/usr/bin/env bash

set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_PORT="${API_PORT:-8000}"
API_V1_PREFIX="${API_V1_PREFIX:-/api/v1}"
ENGINE_PORT="${ENGINE_PORT:-9000}"
API_HOST="${API_HOST:-localhost}"
ENGINE_HOST="${ENGINE_HOST:-localhost}"
API_BASE_URL="${API_BASE_URL:-http://${API_HOST}:${API_PORT}}"
ENGINE_BASE_URL="${ENGINE_BASE_URL:-http://${ENGINE_HOST}:${ENGINE_PORT}}"

echo "== compose services =="
docker compose -f infra/compose/compose.yaml ps

echo
echo "== api /health =="
curl -fsS "${API_BASE_URL}${API_V1_PREFIX}/health"

echo
echo
echo "== api /health/order-intake =="
curl -fsS "${API_BASE_URL}${API_V1_PREFIX}/health/order-intake"

echo
echo
echo "== market-engine /internal/health =="
curl -fsS "${ENGINE_BASE_URL}/internal/health"

echo
