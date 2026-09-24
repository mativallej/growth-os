#!/bin/bash
# Digest semanal → #growth-mativallej. Lo dispara launchd.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT="$HOME/vaults/brain"
exec >> "$ROOT/logs/digest.log" 2>&1
echo "───── $(date '+%Y-%m-%d %H:%M')"
/usr/bin/python3 "$VAULT/.claude/skills/brain-growth-digest/scripts/state.py" \
  | /usr/bin/python3 "$ROOT/scripts/notify-discord.py" --brand mativallej
