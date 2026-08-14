#!/bin/sh
set -eu

marker=/home/node/.n8n/.ekvaar-workflows-imported-v3
if [ ! -f "$marker" ]; then
  n8n import:workflow --separate --input=/opt/ekvaar/workflows
  n8n publish:workflow --id=IF1CS5po1jkq9M7D
  n8n publish:workflow --id=ekvaar-daily-learning
  touch "$marker"
fi
exec n8n
