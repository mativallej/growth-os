#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ingesta un export CSV de analytics de X y escribe los cortes en el footer.

La fuente de verdad son los `.md`. Este script lleva los números del export al
footer de cada pieza, en el formato de `docs/footer-contract.md`: **una línea de
corte, sin campos base**. No inventa nada — si no puede emparejar una fila con
una pieza, la reporta y sigue; si una métrica viene en 0, omite la clave.

Sin dependencias (solo stdlib), para que corra igual en local y en una routine.

    python3 ingest-analytics.py --csv <export.csv> --vault <dir de contenido>
    python3 ingest-analytics.py --csv ... --vault ... --apply

Por defecto es DRY-RUN.
"""

import argparse
import csv
import io
import os
import re
import sys
from datetime import datetime

# CSV de X → clave abreviada del contrato
KEY_MAP = [
    ("Impressions", "imp"), ("Engagements", "eng"), ("Likes", "likes"),
    ("Bookmarks", "bmk"), ("Reposts", "rt"), ("Replies", "replies"),
    ("Shares", "shares"), ("Profile visits", "pv"), ("New follows", "follows"),
    ("Detail Expands", "detail"), ("URL Clicks", "clicks"),
]
STATUS_ID = re.compile(r"/status/(\d+)")
ISO = re.compile(r"(20\d\d-\d\d-\d\d)")


def post_id(url):
    m = STATUS_ID.search(url or "")
    return m.group(1) if m else None


def parse_csv_date(raw):
    for fmt in ("%a, %b %d, %Y", "%Y-%m-%d", "%b %d, %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).date()
        except ValueError:
            continue
    return None


def read_piece(path):
    text = io.open(path, encoding="utf-8").read()
    lines = text.split("\n")
    sep = None
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == "---":
            sep = i
            break
    fields = {}
    if sep is not None:
        for idx in range(sep + 1, len(lines)):
            m = re.match(r"^\s*-\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$", lines[idx])
            if m:
                fields[m.group(1).lower()] = m.group(2).strip()
    return text, fields


def index_vault(vault):
    idx = {}
    for dp, dn, fn in os.walk(vault):
        dn[:] = [d for d in dn if not d.startswith(".")]
        for f in fn:
            if not f.endswith(".md"):
                continue
            p = os.path.join(dp, f)
            try:
                _, fields = read_piece(p)
            except Exception:
                continue
            pid = post_id(fields.get("url", ""))
            if pid:
                idx[pid] = p
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--vault", required=True)
    ap.add_argument("--as-of", help="fecha del corte (AAAA-MM-DD); por defecto sale del nombre del archivo")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    as_of = a.as_of or (ISO.findall(os.path.basename(a.csv)) or [None])[-1]
    if not as_of:
        sys.exit("No pude deducir la fecha del corte. Pasá --as-of AAAA-MM-DD.")
    as_of_d = datetime.strptime(as_of, "%Y-%m-%d").date()

    vault = os.path.expanduser(a.vault)
    idx = index_vault(vault)
    print("Piezas del vault con URL de X: %d" % len(idx))
    print("Corte del export: %s\n" % as_of)

    matched = unmatched = already = 0
    writes = {}

    with io.open(os.path.expanduser(a.csv), encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            pid = (row.get("Post id") or "").strip() or post_id(row.get("Post Link", ""))
            path = idx.get(pid)
            if not path:
                unmatched += 1
                continue
            matched += 1
            text, fields = read_piece(path)
            if "snapshot %s" % as_of in text:
                already += 1
                continue

            pairs = []
            for col, short in KEY_MAP:
                raw = (row.get(col) or "").replace(",", "").strip()
                if raw.isdigit() and int(raw) > 0:      # 0 → se omite la clave
                    pairs.append("%s=%s" % (short, raw))
            if not pairs:
                continue

            pub = None
            if "date" in fields:
                m = ISO.search(fields["date"])
                if m:
                    pub = datetime.strptime(m.group(1), "%Y-%m-%d").date()
            pub = pub or parse_csv_date(row.get("Date", ""))
            horizon = "+%dd" % (as_of_d - pub).days if pub else "s/f"

            line = "- snapshot %s (%s): %s" % (as_of, horizon, " ".join(pairs))
            writes[path] = (text, line)
            print("── %s\n     + %s" % (os.path.relpath(path, vault), line))

    print("\nemparejadas: %d · ya tenían este corte: %d · sin pieza en el vault: %d"
          % (matched, already, unmatched))
    print("archivos a modificar: %d" % len(writes))

    if not a.apply:
        print("\nDRY-RUN. Nada se escribió. Agregá --apply para aplicar.")
        return
    for path, (text, line) in writes.items():
        io.open(path, "w", encoding="utf-8").write(text.rstrip("\n") + "\n" + line + "\n")
    print("\n✓ %d archivos escritos." % len(writes))


if __name__ == "__main__":
    main()
