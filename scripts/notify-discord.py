#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Manda un texto a Discord, al canal de la marca. Lee de stdin.

    python3 state.py | python3 notify-discord.py --brand mativallej
    python3 notify-discord.py --brand tegu --text "algo" --username ingest

El destino sale de config/sources.json (`notify.discord_webhook_env`), y la URL
de una variable de entorno con ese nombre — nunca del repo. En local se lee de
.env.local; en una routine, de sus variables de entorno.
"""
import argparse, io, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LIMIT = 1900  # Discord corta en 2000; dejamos aire


def load_env_file():
    p = os.path.join(ROOT, ".env.local")
    if not os.path.isfile(p):
        return
    for line in io.open(p, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def chunks(text, limit=LIMIT):
    out, cur = [], ""
    for line in text.split("\n"):
        if len(cur) + len(line) + 1 > limit:
            out.append(cur.rstrip())
            cur = ""
        cur += line + "\n"
    if cur.strip():
        out.append(cur.rstrip())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--brand", required=True)
    ap.add_argument("--text", help="si se omite, lee de stdin")
    ap.add_argument("--username", default="growth-loop")
    ap.add_argument("--webhook-env", help="usar otra variable de entorno como destino (ej. un canal por evento)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    load_env_file()
    brands = {b["id"]: b for b in json.load(io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8"))["brands"]}
    if a.brand not in brands:
        sys.exit("Marca desconocida: %s" % a.brand)
    notify = brands[a.brand].get("notify") or {}
    var = a.webhook_env or notify.get("discord_webhook_env")
    if not var:
        sys.exit("La marca '%s' no tiene notify.discord_webhook_env en la config." % a.brand)
    url = os.environ.get(var)
    if not url:
        sys.exit("Falta la variable de entorno %s (la URL del webhook)." % var)

    text = a.text if a.text is not None else sys.stdin.read()
    if not text.strip():
        sys.exit("Nada para mandar.")

    parts = chunks(text)
    destino = ch.get("channel") if (ch := next((c for c in (json.load(io.open(os.path.join(ROOT,"config/sources.json"), encoding="utf-8")).get("channels") or {}).values() if c.get("discord_webhook_env") == var), None)) else notify.get("channel", "?")
    print("→ marca %s · canal #%s · %d mensaje(s)" % (a.brand, destino, len(parts)))
    if a.dry_run:
        print("DRY-RUN, no se envió.")
        return
    for i, part in enumerate(parts, 1):
        payload = json.dumps({"content": part, "username": a.username}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={
            "Content-Type": "application/json",
            # Discord devuelve 403 con el User-Agent por defecto de urllib
            "User-Agent": "growth-loop (https://github.com/mativallej, 0.1)",
        })
        with urllib.request.urlopen(req, timeout=20) as r:
            print("   %d/%d → HTTP %s" % (i, len(parts), r.status))


if __name__ == "__main__":
    main()
