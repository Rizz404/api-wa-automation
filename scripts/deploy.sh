#!/usr/bin/env bash
# Redeploy helper — run on the server from the app root.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building & restarting stack"
$COMPOSE up -d --build

echo "==> Waiting for API health"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${API_PORT:-3000}/health" >/dev/null 2>&1; then
    echo "API healthy."
    exit 0
  fi
  sleep 2
done

echo "API did not become healthy in time. Recent logs:" >&2
$COMPOSE logs --tail=50 api >&2
exit 1
