#!/bin/bash
# Publica al canal las ideas nuevas de la cola. Idempotente: sin nada nuevo, no
# postea.
#
# LO DISPARA UNA PERSONA y reporta en pantalla. Ver el comentario de digest.sh:
# la redirección a un log era de cuando lo corría launchd, y es lo que hace que
# un fallo pase desapercibido.
#
#   bash scripts/publicar-ideas.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Ideas nuevas · $(date '+%Y-%m-%d %H:%M')"
/usr/bin/python3 "$ROOT/scripts/notify-ideas.py"
