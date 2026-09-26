#!/bin/bash
# Digest de growth de la marca personal → su canal de avisos.
#
# LO DISPARA UNA PERSONA, y la salida va a quien lo invocó. Antes redirigía a
# `logs/digest.log` porque lo corría launchd y no había nadie mirando; ese
# agendado se apagó el 2026-09-24 (regla dura 6). Un script que se traga su
# propia salida es el que falla mudo — y los dos agendados que existían fallaron
# exactamente así: uno nunca corrió y el otro corrió una vez en 23 horas, sin que
# nadie se enterara.
#
#   bash scripts/digest.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VAULT="${VAULT_PERSONAL_DIR:-$HOME/vaults/brain}"

ESTADO="$VAULT/.claude/skills/brain-growth-digest/scripts/state.py"
if [ ! -f "$ESTADO" ]; then
  echo "No existe $ESTADO." >&2
  echo "El digest lo arma una skill del vault personal. Si el vault se movió," >&2
  echo "reapuntalo con VAULT_PERSONAL_DIR." >&2
  exit 1
fi

echo "Digest de growth · $(date '+%Y-%m-%d %H:%M')"
/usr/bin/python3 "$ESTADO" | /usr/bin/python3 "$ROOT/scripts/notify-discord.py" --brand mativallej
