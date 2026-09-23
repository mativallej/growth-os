#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Avisa a Discord cada idea de contenido nueva, de cualquier marca.

Mira las carpetas declaradas en config/sources.json → channels.ideas.watch y
compara contra un archivo de estado local. Solo postea lo que no vio antes:
correrlo dos veces no duplica nada.

    python3 notify-ideas.py --init     # registra lo que ya existe, no postea
    python3 notify-ideas.py            # postea las nuevas
    python3 notify-ideas.py --dry-run
"""
import argparse, io, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STATE = os.path.join(ROOT, ".state", "ideas-seen.json")


def meta(path):
    """TL;DR y campos del footer de una idea."""
    try: t = io.open(path, encoding="utf-8").read()
    except Exception: return {}
    out = {}
    m = re.search(r"^TL;DR:\s*(.+)$", t, re.M)
    if m: out["tldr"] = m.group(1).strip()
    for k in ("canal", "cuenta", "formato", "fórmula", "estado"):
        m = re.search(r"%s:\s*([^·\n]+)" % k, t)
        if m: out[k] = m.group(1).strip()
    for k in ("platform", "formula", "status"):
        m = re.search(r"^-\s+%s:\s*(.+)$" % k, t, re.M)
        if m: out.setdefault(k, m.group(1).strip())
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--init", action="store_true", help="registra lo existente sin postear")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cfg = json.load(io.open(os.path.join(ROOT, "config/sources.json"), encoding="utf-8"))
    brands = {b["id"]: b for b in cfg["brands"]}
    ch = cfg["channels"]["ideas"]

    found = {}
    for w in ch["watch"]:
        b = brands.get(w["brand"])
        if not b: continue
        root = os.path.join(os.path.expanduser(b["vault"]), w["path"])
        if not os.path.isdir(root): continue
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if not d.startswith(".")]
            for f in fn:
                if f.endswith(".md") and f.lower() != "readme.md":
                    found[os.path.join(dp, f)] = b

    seen = set()
    if os.path.isfile(STATE):
        seen = set(json.load(io.open(STATE, encoding="utf-8")))
    nuevas = [p for p in sorted(found) if p not in seen]

    print("ideas encontradas: %d · ya vistas: %d · nuevas: %d" % (len(found), len(seen), len(nuevas)))
    if a.init:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        io.open(STATE, "w", encoding="utf-8").write(json.dumps(sorted(found), ensure_ascii=False, indent=1))
        print("✓ baseline registrado. No se posteó nada.")
        return
    if not nuevas:
        print("Nada nuevo.")
        return

    for p in nuevas:
        b = found[p]; m = meta(p)
        etiquetas = " · ".join(x for x in [b["label"],
                                           m.get("canal") or m.get("platform"),
                                           m.get("formato"),
                                           m.get("fórmula") or m.get("formula")] if x)
        cuerpo = "💡 **%s**\n%s%s" % (
            os.path.basename(p)[:-3], etiquetas + "\n" if etiquetas else "",
            ("> " + m["tldr"][:600]) if m.get("tldr") else "_(sin TL;DR)_")
        print("── %s" % os.path.relpath(p, os.path.expanduser(b["vault"])))
        if a.dry_run:
            print(cuerpo + "\n"); continue
        subprocess.run([sys.executable, os.path.join(HERE, "notify-discord.py"),
                        "--brand", b["id"], "--username", "ideas",
                        "--webhook-env", ch["discord_webhook_env"], "--text", cuerpo], check=True)
    if not a.dry_run:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        io.open(STATE, "w", encoding="utf-8").write(json.dumps(sorted(found), ensure_ascii=False, indent=1))
        print("\n✓ %d idea(s) posteadas y registradas." % len(nuevas))


if __name__ == "__main__":
    main()
