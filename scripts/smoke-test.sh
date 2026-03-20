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
ORDER_URL="${API_BASE_URL}${API_V1_PREFIX}/orders"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

request_uuid() {
  python3 - <<'PY'
import uuid
print(uuid.uuid4())
PY
}

json_get() {
  local file_path="$1"
  local expression="$2"
  python3 - "$file_path" "$expression" <<'PY'
import json
import sys

file_path = sys.argv[1]
expression = sys.argv[2]

with open(file_path, "r", encoding="utf-8") as handle:
    payload = json.load(handle)

value = payload
for part in expression.split("."):
    value = value[part]

if isinstance(value, bool):
    print("true" if value else "false")
else:
    print(value)
PY
}

assert_header_contains() {
  local file_path="$1"
  local expected="$2"

  if ! tr -d '\r' <"${file_path}" | grep -Fqi "${expected}"; then
    echo "expected header containing '${expected}', got:" >&2
    cat "${file_path}" >&2
    exit 1
  fi
}

echo "== api health =="
curl -fsS "${API_BASE_URL}${API_V1_PREFIX}/health" | tee "${TMP_DIR}/api-health.json"
echo

if [[ "$(json_get "${TMP_DIR}/api-health.json" "status")" != "ok" ]]; then
  echo "api /health did not return status=ok" >&2
  exit 1
fi

echo
echo "== api order-intake health =="
curl -fsS "${API_BASE_URL}${API_V1_PREFIX}/health/order-intake" | tee "${TMP_DIR}/order-intake-health.json"
echo

if [[ "$(json_get "${TMP_DIR}/order-intake-health.json" "order_intake_enabled")" != "true" ]]; then
  echo "order intake is not enabled" >&2
  exit 1
fi

echo
echo "== market-engine health =="
curl -fsS "${ENGINE_BASE_URL}/internal/health" | tee "${TMP_DIR}/engine-health.json"
echo

if [[ "$(json_get "${TMP_DIR}/engine-health.json" "status")" != "ready" ]]; then
  echo "market engine is not ready" >&2
  exit 1
fi

IDEMPOTENCY_KEY="$(request_uuid)"
REQUEST_BODY='{"market_id":"demo-market-kenya-election","side":"YES","direction":"BUY","price":"0.55","quantity":"10"}'

echo
echo "== create order =="
curl -sS \
  -D "${TMP_DIR}/order-create.headers" \
  -o "${TMP_DIR}/order-create.json" \
  -X POST "${ORDER_URL}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  --data "${REQUEST_BODY}"
cat "${TMP_DIR}/order-create.json"
echo

assert_header_contains "${TMP_DIR}/order-create.headers" "HTTP/1.1 202"
assert_header_contains "${TMP_DIR}/order-create.headers" "X-Idempotency-Status: created"

echo
echo "== replay order with same idempotency key =="
curl -sS \
  -D "${TMP_DIR}/order-replay.headers" \
  -o "${TMP_DIR}/order-replay.json" \
  -X POST "${ORDER_URL}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  --data "${REQUEST_BODY}"
cat "${TMP_DIR}/order-replay.json"
echo

assert_header_contains "${TMP_DIR}/order-replay.headers" "HTTP/1.1 202"
assert_header_contains "${TMP_DIR}/order-replay.headers" "X-Idempotency-Status: replayed"

CREATE_ORDER_ID="$(json_get "${TMP_DIR}/order-create.json" "order_id")"
REPLAY_ORDER_ID="$(json_get "${TMP_DIR}/order-replay.json" "order_id")"

if [[ "${CREATE_ORDER_ID}" != "${REPLAY_ORDER_ID}" ]]; then
  echo "idempotent replay returned a different order_id" >&2
  exit 1
fi

echo
echo "smoke test passed:"
echo "- api health ok"
echo "- order intake health ok"
echo "- market engine ready"
echo "- idempotent order replay returned the original order"
