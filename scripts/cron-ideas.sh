#!/bin/bash
# Ideas nuevas → #ideas. Idempotente: si no hay nada nuevo, no postea.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec >> "$ROOT/logs/ideas.log" 2>&1
echo "───── $(date '+%Y-%m-%d %H:%M')"
/usr/bin/python3 "$ROOT/scripts/notify-ideas.py"
