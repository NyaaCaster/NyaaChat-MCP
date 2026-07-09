#!/bin/bash
# ⚠ DEPRECATED — use `python rebuild.py` instead (push to private registry + build).
set -e
COMPOSE_FILE="docker-compose.yml"

echo "⚠ DEPRECATED — use python rebuild.py"
echo "Stopping containers..."
docker compose -f $COMPOSE_FILE down

echo "Rebuilding image..."
docker compose -f $COMPOSE_FILE build --no-cache

echo "Removing dangling images..."
DANGLING=$(docker images -f "dangling=true" -q)
if [ -n "$DANGLING" ]; then docker rmi -f $DANGLING; fi

echo "Starting containers..."
docker compose -f $COMPOSE_FILE up -d

echo "Done. Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"