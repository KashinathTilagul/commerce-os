#!/bin/sh
set -eu

marker=/home/node/.n8n/.ekvaar-workflows-imported-v3
node_router_marker=/home/node/.n8n/.ekvaar-krishna-node-router-imported-v1
if [ ! -f "$marker" ]; then
  n8n import:workflow --separate --input=/opt/ekvaar/workflows
  n8n publish:workflow --id=IF1CS5po1jkq9M7D
  n8n publish:workflow --id=ekvaar-daily-learning
  touch "$marker"
  touch "$node_router_marker"
elif [ ! -f "$node_router_marker" ]; then
  n8n import:workflow --input=/opt/ekvaar/workflows/krishna-llm-nodes.json
  touch "$node_router_marker"
fi
exec n8n
